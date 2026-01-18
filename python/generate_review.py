#!/usr/bin/env python3
"""
Generate interactive review HTML for classification results.

Usage:
    python generate_review.py <output-dir>

Example:
    python generate_review.py ../OUTPUT/VideoName/1
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List


def load_classification_results(output_dir: Path) -> Dict:
    """Load classification results from report.json"""
    report_path = output_dir / 'report.json'
    if not report_path.exists():
        print(f"Error: report.json not found in {output_dir}")
        sys.exit(1)

    with open(report_path, 'r') as f:
        return json.load(f)


def generate_html(output_dir: Path, report: Dict) -> str:
    """Generate interactive review HTML"""

    # Extract frames from report (assuming single input for now)
    if not report.get('inputs') or len(report['inputs']) == 0:
        print("Error: No inputs found in report")
        sys.exit(1)

    input_result = report['inputs'][0]
    frames = input_result.get('frames', [])

    # Separate frames by classification
    keep_frames = []
    exclude_frames = []
    unclassified_frames = []

    for frame in frames:
        classification = frame.get('classification')
        if classification:
            label = classification.get('label')
            if label == 'keep':
                keep_frames.append(frame)
            elif label == 'exclude':
                exclude_frames.append(frame)
            else:
                unclassified_frames.append(frame)
        else:
            unclassified_frames.append(frame)

    # Build HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classification Review - {output_dir.name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            padding: 20px;
        }}

        .header {{
            background: #2a2a2a;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #3a3a3a;
        }}

        .header h1 {{
            font-size: 24px;
            margin-bottom: 10px;
            color: #fff;
        }}

        .stats {{
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }}

        .stat {{
            background: #1a1a1a;
            padding: 10px 15px;
            border-radius: 4px;
            border: 1px solid #3a3a3a;
        }}

        .stat-label {{
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
        }}

        .stat-value {{
            font-size: 24px;
            font-weight: bold;
            margin-top: 5px;
        }}

        .stat-value.keep {{ color: #4ade80; }}
        .stat-value.exclude {{ color: #f87171; }}

        .controls {{
            background: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #3a3a3a;
            display: flex;
            gap: 15px;
            align-items: center;
        }}

        .btn {{
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        }}

        .btn-primary {{
            background: #3b82f6;
            color: white;
        }}

        .btn-primary:hover {{
            background: #2563eb;
        }}

        .btn-success {{
            background: #10b981;
            color: white;
        }}

        .btn-success:hover {{
            background: #059669;
        }}

        .btn:disabled {{
            opacity: 0.5;
            cursor: not-allowed;
        }}

        .feedback {{
            padding: 12px;
            border-radius: 6px;
            margin-left: auto;
            display: none;
        }}

        .feedback.show {{
            display: block;
        }}

        .feedback.success {{
            background: #064e3b;
            color: #6ee7b7;
            border: 1px solid #10b981;
        }}

        .feedback.error {{
            background: #7f1d1d;
            color: #fca5a5;
            border: 1px solid #ef4444;
        }}

        .section {{
            margin-bottom: 40px;
        }}

        .section-header {{
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }}

        .section-title {{
            font-size: 20px;
            font-weight: 600;
        }}

        .section-title.keep {{ color: #4ade80; }}
        .section-title.exclude {{ color: #f87171; }}

        .section-count {{
            background: #1a1a1a;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            color: #888;
        }}

        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
        }}

        .card {{
            background: #2a2a2a;
            border-radius: 8px;
            overflow: hidden;
            border: 3px solid transparent;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
        }}

        .card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }}

        .card.keep {{
            border-color: #4ade80;
        }}

        .card.exclude {{
            border-color: #f87171;
        }}

        .card.modified {{
            border-color: #fbbf24;
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2);
        }}

        .card.modified .label::after {{
            content: " (Modified)";
            color: #fbbf24;
            font-weight: bold;
        }}

        .card img {{
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }}

        .card-footer {{
            padding: 12px;
        }}

        .label {{
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 5px;
        }}

        .label.keep {{ color: #4ade80; }}
        .label.exclude {{ color: #f87171; }}

        .filename {{
            font-size: 12px;
            color: #888;
            font-family: 'Monaco', 'Courier New', monospace;
        }}

        .confidence {{
            font-size: 11px;
            color: #666;
            margin-top: 4px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Classification Review</h1>
        <p>Click on any image to toggle its classification</p>
        <div class="stats">
            <div class="stat">
                <div class="stat-label">Total</div>
                <div class="stat-value">{len(frames)}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Keep</div>
                <div class="stat-value keep" id="keep-count">{len(keep_frames)}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Exclude</div>
                <div class="stat-value exclude" id="exclude-count">{len(exclude_frames)}</div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button class="btn btn-primary" id="submit-btn" disabled>Submit Corrections</button>
        <button class="btn btn-success" id="retrain-btn">Retrain Model</button>
        <div class="feedback" id="feedback"></div>
    </div>

    <div class="section">
        <div class="section-header">
            <h2 class="section-title keep">Keep</h2>
            <span class="section-count">{len(keep_frames)} images</span>
        </div>
        <div class="grid" id="keep-grid">
"""

    # Add keep frames
    for frame in keep_frames:
        filename = Path(frame['path']).name
        confidence = frame.get('classification', {}).get('confidence', 0)
        html += f"""
            <div class="card keep" data-filename="{filename}" data-original-label="keep">
                <img src="{filename}" alt="{filename}">
                <div class="card-footer">
                    <div class="label keep">Keep</div>
                    <div class="filename">{filename}</div>
                    <div class="confidence">{confidence:.2%} confidence</div>
                </div>
            </div>
"""

    html += """
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <h2 class="section-title exclude">Exclude</h2>
            <span class="section-count">{len(exclude_frames)} images</span>
        </div>
        <div class="grid" id="exclude-grid">
"""

    # Add exclude frames
    for frame in exclude_frames:
        filename = Path(frame['path']).name
        confidence = frame.get('classification', {}).get('confidence', 0)
        html += f"""
            <div class="card exclude" data-filename="{filename}" data-original-label="exclude">
                <img src="{filename}" alt="{filename}">
                <div class="card-footer">
                    <div class="label exclude">Exclude</div>
                    <div class="filename">{filename}</div>
                    <div class="confidence">{confidence:.2%} confidence</div>
                </div>
            </div>
"""

    html += f"""
        </div>
    </div>

    <script>
        // Track modifications
        const modifications = new Map();

        // Get all cards
        const cards = document.querySelectorAll('.card');
        const submitBtn = document.getElementById('submit-btn');
        const retrainBtn = document.getElementById('retrain-btn');
        const feedback = document.getElementById('feedback');

        // Add click handlers
        cards.forEach(card => {{
            card.addEventListener('click', () => {{
                const filename = card.dataset.filename;
                const originalLabel = card.dataset.originalLabel;
                const currentLabel = card.classList.contains('keep') ? 'keep' : 'exclude';

                // Toggle label
                const newLabel = currentLabel === 'keep' ? 'exclude' : 'keep';

                // Update UI
                card.classList.remove('keep', 'exclude');
                card.classList.add(newLabel);

                const labelEl = card.querySelector('.label');
                labelEl.classList.remove('keep', 'exclude');
                labelEl.classList.add(newLabel);
                labelEl.textContent = newLabel.charAt(0).toUpperCase() + newLabel.slice(1);

                // Track modification
                if (newLabel !== originalLabel) {{
                    modifications.set(filename, newLabel);
                    card.classList.add('modified');
                }} else {{
                    modifications.delete(filename);
                    card.classList.remove('modified');
                }}

                // Update submit button
                submitBtn.disabled = modifications.size === 0;
                submitBtn.textContent = `Submit Corrections (${{modifications.size}})`;
            }});
        }});

        // Submit corrections
        submitBtn.addEventListener('click', async () => {{
            const corrections = Array.from(modifications.entries()).map(([filename, newLabel]) => ({{
                filename,
                newLabel
            }}));

            try {{
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';

                const response = await fetch('/api/corrections', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ corrections }})
                }});

                const result = await response.json();

                if (result.success) {{
                    showFeedback(`✓ Moved ${{result.movedCount}} images to training data. Click "Retrain Model" to update the classifier.`, 'success');

                    // Clear modifications
                    modifications.clear();
                    cards.forEach(card => {{
                        card.classList.remove('modified');
                        const currentLabel = card.classList.contains('keep') ? 'keep' : 'exclude';
                        card.dataset.originalLabel = currentLabel;
                    }});

                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submit Corrections';
                }} else {{
                    showFeedback(`✗ Error: ${{result.error}}`, 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = `Submit Corrections (${{modifications.size}})`;
                }}
            }} catch (error) {{
                showFeedback(`✗ Failed to submit corrections: ${{error.message}}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = `Submit Corrections (${{modifications.size}})`;
            }}
        }});

        // Retrain model
        retrainBtn.addEventListener('click', async () => {{
            try {{
                retrainBtn.disabled = true;
                retrainBtn.textContent = 'Training...';
                showFeedback('Training model, this may take a few minutes...', 'success');

                const response = await fetch('/api/retrain', {{
                    method: 'POST'
                }});

                const result = await response.json();

                if (result.success) {{
                    const metrics = result.metrics;
                    showFeedback(
                        `✓ Model retrained! Accuracy: ${{metrics.accuracy}}, Precision: ${{metrics.precision}}, Recall: ${{metrics.recall}}`,
                        'success'
                    );
                }} else {{
                    showFeedback(`✗ Training failed: ${{result.error}}`, 'error');
                }}
            }} catch (error) {{
                showFeedback(`✗ Failed to retrain: ${{error.message}}`, 'error');
            }} finally {{
                retrainBtn.disabled = false;
                retrainBtn.textContent = 'Retrain Model';
            }}
        }});

        function showFeedback(message, type) {{
            feedback.textContent = message;
            feedback.className = `feedback show ${{type}}`;
            setTimeout(() => {{
                feedback.classList.remove('show');
            }}, 8000);
        }}
    </script>
</body>
</html>
"""

    return html


def main():
    parser = argparse.ArgumentParser(description='Generate interactive review HTML for classification results')
    parser.add_argument('output_dir', type=str, help='Path to output directory containing report.json')
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()

    if not output_dir.exists():
        print(f"Error: Output directory not found: {output_dir}")
        sys.exit(1)

    print(f"Loading classification results from {output_dir}...")
    report = load_classification_results(output_dir)

    print("Generating interactive review HTML...")
    html = generate_html(output_dir, report)

    # Write HTML file
    review_path = output_dir / 'review.html'
    with open(review_path, 'w') as f:
        f.write(html)

    print(f"\n✓ Review page generated: {review_path}")
    print(f"\nNext steps:")
    print(f"1. Start feedback server: python feedback_server.py {output_dir}")
    print(f"2. Open browser to http://localhost:5050")


if __name__ == '__main__':
    main()
