#!/usr/bin/env python3
"""
Flask server for interactive classification feedback.

Usage:
    python feedback_server.py <output-dir>

Example:
    python feedback_server.py ../OUTPUT/VideoName/1
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from PIL import Image
import imagehash

app = Flask(__name__)

# Global state
OUTPUT_DIR = None
TRAINING_DATA_DIR = None
MODEL_PATH = None
BLOCKLIST_PATH = None


@app.route('/')
def serve_review():
    """Serve the interactive review HTML page."""
    review_html = OUTPUT_DIR / 'review.html'
    if not review_html.exists():
        return jsonify({'error': 'review.html not found. Run generate_review.py first.'}), 404
    return send_file(review_html)


@app.route('/<filename>')
def serve_static(filename):
    """Serve static files (images) from the output directory."""
    # Only serve image files to avoid intercepting API routes
    if not any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
        return jsonify({'error': 'Not found'}), 404

    file_path = OUTPUT_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        return jsonify({'error': f'File not found: {filename}'}), 404
    return send_file(file_path)


@app.route('/api/corrections', methods=['POST'])
def handle_corrections():
    """
    Accept corrections and copy images to training data directories.

    Expected JSON format:
    {
        "corrections": [
            {"filename": "still_0001.jpg", "newLabel": "keep"},
            {"filename": "still_0002.jpg", "newLabel": "exclude"}
        ]
    }
    """
    try:
        data = request.get_json()
        corrections = data.get('corrections', [])

        if not corrections:
            return jsonify({'error': 'No corrections provided'}), 400

        # Ensure training data directories exist
        keep_dir = TRAINING_DATA_DIR / 'keep'
        exclude_dir = TRAINING_DATA_DIR / 'exclude'
        keep_dir.mkdir(parents=True, exist_ok=True)
        exclude_dir.mkdir(parents=True, exist_ok=True)

        # Extract video name and scan number from OUTPUT_DIR (e.g., OUTPUT/VideoName/1/)
        # OUTPUT_DIR structure: .../OUTPUT/VideoName/ScanNumber
        video_name = OUTPUT_DIR.parent.name  # VideoName
        scan_number = OUTPUT_DIR.name        # ScanNumber

        moved_count = 0
        errors = []

        for correction in corrections:
            filename = correction.get('filename')
            new_label = correction.get('newLabel')

            if not filename or not new_label:
                errors.append(f"Invalid correction: {correction}")
                continue

            # Find source image in output directory
            source_path = OUTPUT_DIR / filename
            if not source_path.exists():
                errors.append(f"Image not found: {filename}")
                continue

            # Determine destination directory
            if new_label == 'keep':
                dest_dir = keep_dir
            elif new_label == 'exclude':
                dest_dir = exclude_dir
            else:
                errors.append(f"Invalid label '{new_label}' for {filename}")
                continue

            # Prefix filename with video name and scan number to avoid collisions
            # Format: VideoName_ScanNumber_still_0001.jpg
            name_stem = Path(filename).stem
            name_ext = Path(filename).suffix
            prefixed_filename = f"{video_name}_{scan_number}_{name_stem}{name_ext}"
            dest_path = dest_dir / prefixed_filename

            try:
                shutil.copy2(source_path, dest_path)
                moved_count += 1
            except Exception as e:
                errors.append(f"Failed to copy {filename}: {str(e)}")

        response = {
            'success': True,
            'movedCount': moved_count,
            'totalCorrections': len(corrections)
        }

        if errors:
            response['errors'] = errors

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/retrain', methods=['POST'])
def handle_retrain():
    """
    Trigger model retraining using existing training data.

    Runs train_classifier.py as a subprocess and returns results.
    """
    try:
        # Get script directory
        script_dir = Path(__file__).parent
        train_script = script_dir / 'train_classifier.py'

        if not train_script.exists():
            return jsonify({'error': 'train_classifier.py not found'}), 500

        # Check if training data exists
        if not TRAINING_DATA_DIR.exists():
            return jsonify({'error': f'Training data directory not found: {TRAINING_DATA_DIR}'}), 400

        keep_images = list((TRAINING_DATA_DIR / 'keep').glob('*.jpg')) if (TRAINING_DATA_DIR / 'keep').exists() else []
        exclude_images = list((TRAINING_DATA_DIR / 'exclude').glob('*.jpg')) if (TRAINING_DATA_DIR / 'exclude').exists() else []

        if len(keep_images) == 0 and len(exclude_images) == 0:
            return jsonify({'error': 'No training images found'}), 400

        # Run training script
        cmd = [
            sys.executable,
            str(train_script),
            '--data', str(TRAINING_DATA_DIR),
            '--output', str(MODEL_PATH),
            '--device', 'cpu'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            return jsonify({
                'error': 'Training failed',
                'stderr': result.stderr
            }), 500

        # Parse training output for metrics
        output_lines = result.stdout.strip().split('\n')
        metrics = {
            'accuracy': None,
            'precision': None,
            'recall': None
        }

        for line in output_lines:
            if 'Accuracy:' in line:
                metrics['accuracy'] = line.split(':')[1].strip()
            elif 'Precision:' in line:
                metrics['precision'] = line.split(':')[1].strip()
            elif 'Recall:' in line:
                metrics['recall'] = line.split(':')[1].strip()

        return jsonify({
            'success': True,
            'metrics': metrics,
            'output': result.stdout
        })

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Training timed out (5 minutes)'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/compare', methods=['POST'])
def handle_compare():
    """
    Compare current model with potential retrained model (dry-run).

    Returns metrics comparison and recommendation without saving.
    """
    try:
        # Get script directory
        script_dir = Path(__file__).parent
        train_script = script_dir / 'train_classifier.py'

        if not train_script.exists():
            return jsonify({'error': 'train_classifier.py not found'}), 500

        # Check if training data exists
        if not TRAINING_DATA_DIR.exists():
            return jsonify({'error': f'Training data directory not found: {TRAINING_DATA_DIR}'}), 400

        keep_images = list((TRAINING_DATA_DIR / 'keep').glob('*.jpg')) if (TRAINING_DATA_DIR / 'keep').exists() else []
        exclude_images = list((TRAINING_DATA_DIR / 'exclude').glob('*.jpg')) if (TRAINING_DATA_DIR / 'exclude').exists() else []

        if len(keep_images) == 0 and len(exclude_images) == 0:
            return jsonify({'error': 'No training images found'}), 400

        # Load current model metadata if it exists
        current_metrics = None
        meta_path = MODEL_PATH.with_suffix('.meta.json')
        if meta_path.exists():
            with open(meta_path, 'r') as f:
                metadata = json.load(f)
                current_metrics = metadata.get('metrics', {})

        # Run training script with --dry-run
        cmd = [
            sys.executable,
            str(train_script),
            '--data', str(TRAINING_DATA_DIR),
            '--output', str(MODEL_PATH),
            '--device', 'cpu',
            '--dry-run'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            return jsonify({
                'error': 'Dry-run evaluation failed',
                'stderr': result.stderr
            }), 500

        # Parse output for new metrics
        output_lines = result.stdout.strip().split('\n')
        new_metrics = {
            'accuracy': None,
            'precision': None,
            'recall': None,
            'f1': None
        }

        for line in output_lines:
            if 'Accuracy:' in line and '+/-' in line:
                # Parse "Accuracy:  0.875 (+/- 0.042)"
                parts = line.split(':')[1].strip().split('(')[0].strip()
                new_metrics['accuracy'] = parts
            elif 'Precision:' in line and '+/-' in line:
                parts = line.split(':')[1].strip().split('(')[0].strip()
                new_metrics['precision'] = parts
            elif 'Recall:' in line and '+/-' in line:
                parts = line.split(':')[1].strip().split('(')[0].strip()
                new_metrics['recall'] = parts
            elif 'F1-Score:' in line and '+/-' in line:
                parts = line.split(':')[1].strip().split('(')[0].strip()
                new_metrics['f1'] = parts

        # Calculate improvement if current model exists
        recommendation = None
        improvement = None

        if current_metrics:
            try:
                current_acc = current_metrics.get('accuracy_mean', 0)
                new_acc = float(new_metrics['accuracy']) if new_metrics['accuracy'] else 0

                if new_acc > current_acc:
                    improvement = ((new_acc - current_acc) / current_acc) * 100
                    if improvement > 5:
                        recommendation = f"Retrain recommended: +{improvement:.1f}% accuracy improvement"
                    else:
                        recommendation = f"Minor improvement: +{improvement:.1f}% accuracy (retrain optional)"
                else:
                    recommendation = "Current model performs better. Retrain not recommended."
            except (ValueError, TypeError):
                recommendation = "Unable to calculate improvement"
        else:
            recommendation = "No current model for comparison. Retrain to create baseline."

        return jsonify({
            'success': True,
            'current_metrics': current_metrics,
            'new_metrics': new_metrics,
            'recommendation': recommendation,
            'improvement': improvement,
            'output': result.stdout
        })

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Evaluation timed out (5 minutes)'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/blocklist', methods=['POST'])
def handle_blocklist():
    """
    Add an image to the blocklist by computing its pHash.

    Expected JSON format:
    {
        "filename": "still_0001.jpg"
    }
    """
    try:
        data = request.get_json()
        filename = data.get('filename')

        if not filename:
            return jsonify({'error': 'No filename provided'}), 400

        # Find source image in output directory
        source_path = OUTPUT_DIR / filename
        if not source_path.exists():
            return jsonify({'error': f'Image not found: {filename}'}), 404

        # Compute pHash using imagehash (same as sharp-phash)
        img = Image.open(source_path)
        phash = imagehash.phash(img, hash_size=8)  # 8x8 = 64 bits
        hash_hex = str(phash)

        # Load existing blocklist
        if BLOCKLIST_PATH.exists():
            with open(BLOCKLIST_PATH, 'r') as f:
                blocklist = json.load(f)
        else:
            blocklist = {'version': 1, 'entries': []}

        # Check if hash already exists
        existing = any(entry['hash'] == hash_hex for entry in blocklist['entries'])
        if existing:
            return jsonify({'error': 'Image already in blocklist'}), 400

        # Add new entry
        from datetime import datetime
        entry = {
            'hash': hash_hex,
            'description': f'Added via feedback UI',
            'source': str(source_path.relative_to(OUTPUT_DIR.parent)),
            'addedAt': datetime.utcnow().isoformat() + 'Z'
        }
        blocklist['entries'].append(entry)

        # Ensure models directory exists
        BLOCKLIST_PATH.parent.mkdir(parents=True, exist_ok=True)

        # Save blocklist
        with open(BLOCKLIST_PATH, 'w') as f:
            json.dump(blocklist, f, indent=2)

        return jsonify({
            'success': True,
            'hash': hash_hex,
            'description': entry['description']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def main():
    parser = argparse.ArgumentParser(description='Start feedback server for classification review')
    parser.add_argument('output_dir', type=str, help='Path to classification output directory (e.g., OUTPUT/VideoName/1)')
    parser.add_argument('--port', type=int, default=5050, help='Port to run server on (default: 5050)')
    parser.add_argument('--training-data', type=str, help='Path to training-data directory (default: ../training-data)')
    parser.add_argument('--model', type=str, help='Path to classifier model (default: ../models/classifier.pkl)')
    parser.add_argument('--blocklist', type=str, help='Path to blocklist file (default: ../models/blocklist.json)')
    args = parser.parse_args()

    # Set global paths
    global OUTPUT_DIR, TRAINING_DATA_DIR, MODEL_PATH, BLOCKLIST_PATH
    OUTPUT_DIR = Path(args.output_dir).resolve()

    if not OUTPUT_DIR.exists():
        print(f"Error: Output directory not found: {OUTPUT_DIR}")
        sys.exit(1)

    # Default training data path (relative to script location)
    script_dir = Path(__file__).parent
    if args.training_data:
        TRAINING_DATA_DIR = Path(args.training_data).resolve()
    else:
        TRAINING_DATA_DIR = script_dir.parent / 'training-data'

    # Default model path
    if args.model:
        MODEL_PATH = Path(args.model).resolve()
    else:
        MODEL_PATH = script_dir.parent / 'models' / 'classifier.pkl'

    # Default blocklist path
    if args.blocklist:
        BLOCKLIST_PATH = Path(args.blocklist).resolve()
    else:
        BLOCKLIST_PATH = script_dir.parent / 'models' / 'blocklist.json'

    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Training data: {TRAINING_DATA_DIR}")
    print(f"Model path: {MODEL_PATH}")
    print(f"Blocklist path: {BLOCKLIST_PATH}")
    print(f"\nStarting server at http://localhost:{args.port}")
    print(f"Open browser to review and correct classifications.")

    app.run(host='0.0.0.0', port=args.port, debug=False)


if __name__ == '__main__':
    main()
