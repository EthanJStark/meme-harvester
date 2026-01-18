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

app = Flask(__name__)

# Global state
OUTPUT_DIR = None
TRAINING_DATA_DIR = None
MODEL_PATH = None


@app.route('/')
def serve_review():
    """Serve the interactive review HTML page."""
    review_html = OUTPUT_DIR / 'review.html'
    if not review_html.exists():
        return jsonify({'error': 'review.html not found. Run generate_review.py first.'}), 404
    return send_file(review_html)


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

            # Copy image to training data directory
            dest_path = dest_dir / filename
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


def main():
    parser = argparse.ArgumentParser(description='Start feedback server for classification review')
    parser.add_argument('output_dir', type=str, help='Path to classification output directory (e.g., OUTPUT/VideoName/1)')
    parser.add_argument('--port', type=int, default=5050, help='Port to run server on (default: 5050)')
    parser.add_argument('--training-data', type=str, help='Path to training-data directory (default: ../training-data)')
    parser.add_argument('--model', type=str, help='Path to classifier model (default: ../models/classifier.pkl)')
    args = parser.parse_args()

    # Set global paths
    global OUTPUT_DIR, TRAINING_DATA_DIR, MODEL_PATH
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

    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Training data: {TRAINING_DATA_DIR}")
    print(f"Model path: {MODEL_PATH}")
    print(f"\nStarting server at http://localhost:{args.port}")
    print(f"Open browser to review and correct classifications.")

    app.run(host='0.0.0.0', port=args.port, debug=False)


if __name__ == '__main__':
    main()
