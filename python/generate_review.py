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

        /* Confidence bar */
        .confidence-bar {{
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            z-index: 10;
        }}

        .confidence-bar.low {{
            background: linear-gradient(to right, #f87171 0%, #ef4444 100%);
        }}

        .confidence-bar.medium {{
            background: linear-gradient(to right, #fbbf24 0%, #f59e0b 100%);
        }}

        .confidence-bar.high {{
            background: linear-gradient(to right, #4ade80 0%, #22c55e 100%);
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

        .blocklist-btn {{
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            background: #7f1d1d;
            color: #fca5a5;
            margin-top: 8px;
            width: 100%;
            transition: all 0.2s;
        }}

        .blocklist-btn:hover {{
            background: #991b1b;
            color: #fef2f2;
        }}

        .blocklist-btn:disabled {{
            opacity: 0.5;
            cursor: not-allowed;
        }}

        .card.blocklisted {{
            opacity: 0.5;
            pointer-events: none;
        }}

        .card.blocklisted .blocklist-btn {{
            background: #065f46;
            color: #6ee7b7;
        }}

        /* Container layout */
        .container {{
            display: flex;
            gap: 20px;
            max-width: 1800px;
            margin: 0 auto;
        }}

        .main-content {{
            flex: 1;
            min-width: 0;
        }}

        /* Sidebar styles */
        .sidebar {{
            width: 300px;
            background: #1a1a1a;
            border-radius: 8px;
            border: 1px solid #3a3a3a;
            position: sticky;
            top: 20px;
            height: calc(100vh - 40px);
            display: flex;
            flex-direction: column;
        }}

        .sidebar-header {{
            padding: 20px;
            border-bottom: 1px solid #3a3a3a;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .sidebar-header h2 {{
            font-size: 18px;
            color: #fff;
        }}

        .entry-count {{
            font-size: 12px;
            color: #666;
            background: #2a2a2a;
            padding: 4px 8px;
            border-radius: 12px;
        }}

        .sidebar-content {{
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }}

        .empty-state {{
            text-align: center;
            color: #666;
            padding: 40px 20px;
            font-size: 14px;
            line-height: 1.5;
        }}

        .history-entry {{
            background: #2a2a2a;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            border: 1px solid #3a3a3a;
            transition: all 0.3s;
            animation: fadeIn 0.3s;
        }}

        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(-10px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        .history-entry.error {{
            background: #7f1d1d;
            border-color: #ef4444;
        }}

        .history-entry:hover {{
            background: #333;
        }}

        .entry-timestamp {{
            font-size: 11px;
            color: #888;
            margin-bottom: 6px;
            font-family: 'Monaco', 'Courier New', monospace;
        }}

        .entry-icon {{
            font-size: 16px;
            margin-right: 6px;
        }}

        .entry-message {{
            font-size: 14px;
            color: #e0e0e0;
            line-height: 1.4;
        }}

        .history-entry.error .entry-message {{
            color: #fca5a5;
        }}

        .btn-secondary {{
            background: #3a3a3a;
            color: #888;
        }}

        .btn-secondary:hover {{
            background: #4a4a4a;
            color: #fff;
        }}

        .clear-history-btn {{
            margin: 15px;
        }}

        /* Responsive: stack on small screens */
        @media (max-width: 1200px) {{
            .container {{
                flex-direction: column;
            }}

            .sidebar {{
                width: 100%;
                position: static;
                height: auto;
                max-height: 400px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="main-content">
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
            <div class="stat">
                <div class="stat-label">Unclassified</div>
                <div class="stat-value" style="color: #fbbf24;" id="unclassified-count">{len(unclassified_frames)}</div>
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
            <span class="section-count">{len(keep_frames)} images (sorted by confidence ↑)</span>
        </div>
        <div class="grid" id="keep-grid">
"""

    # Add keep frames
    for frame in keep_frames:
        filename = Path(frame['file']).name
        confidence = frame.get('classification', {}).get('confidence', 0)

        # Determine confidence level for bar
        if confidence > 0:
            if confidence < 0.5:
                conf_class = 'low'
            elif confidence < 0.8:
                conf_class = 'medium'
            else:
                conf_class = 'high'
            conf_bar = f'<div class="confidence-bar {conf_class}"></div>'
        else:
            conf_bar = ''  # No bar if no confidence data

        html += f"""
            <div class="card keep" data-filename="{filename}" data-original-label="keep" data-confidence="{confidence}">
                {conf_bar}
                <img src="{filename}" alt="{filename}">
                <div class="card-footer">
                    <div class="label keep">Keep</div>
                    <div class="filename">{filename}</div>
                    <div class="confidence">{confidence:.2%} confidence</div>
                    <button class="blocklist-btn" onclick="addToBlocklist('{filename}', event)">🚫 Blocklist</button>
                </div>
            </div>
"""

    html += f"""
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <h2 class="section-title exclude">Exclude</h2>
            <span class="section-count">{len(exclude_frames)} images (sorted by confidence ↑)</span>
        </div>
        <div class="grid" id="exclude-grid">
"""

    # Add exclude frames
    for frame in exclude_frames:
        filename = Path(frame['file']).name
        confidence = frame.get('classification', {}).get('confidence', 0)

        # Determine confidence level for bar
        if confidence > 0:
            if confidence < 0.5:
                conf_class = 'low'
            elif confidence < 0.8:
                conf_class = 'medium'
            else:
                conf_class = 'high'
            conf_bar = f'<div class="confidence-bar {conf_class}"></div>'
        else:
            conf_bar = ''  # No bar if no confidence data

        html += f"""
            <div class="card exclude" data-filename="{filename}" data-original-label="exclude" data-confidence="{confidence}">
                {conf_bar}
                <img src="{filename}" alt="{filename}">
                <div class="card-footer">
                    <div class="label exclude">Exclude</div>
                    <div class="filename">{filename}</div>
                    <div class="confidence">{confidence:.2%} confidence</div>
                    <button class="blocklist-btn" onclick="addToBlocklist('{filename}', event)">🚫 Blocklist</button>
                </div>
            </div>
"""

    html += f"""
        </div>
    </div>
"""

    # Add unclassified frames section if any exist
    if unclassified_frames:
        html += f"""
    <div class="section">
        <div class="section-header">
            <h2 class="section-title" style="color: #fbbf24;">Unclassified</h2>
            <span class="section-count">{len(unclassified_frames)} images (no ML classification)</span>
        </div>
        <div class="grid" id="unclassified-grid">
"""
        # Add unclassified frames (assign default label of 'keep' for initial display)
        for frame in unclassified_frames:
            filename = Path(frame['file']).name

            html += f"""
            <div class="card keep" data-filename="{filename}" data-original-label="keep" data-confidence="0">
                <img src="{filename}" alt="{filename}">
                <div class="card-footer">
                    <div class="label keep">Keep</div>
                    <div class="filename">{filename}</div>
                    <div class="confidence">Not yet classified</div>
                    <button class="blocklist-btn" onclick="addToBlocklist('{filename}', event)">🚫 Blocklist</button>
                </div>
            </div>
"""

        html += """
        </div>
    </div>
"""

    html += f"""
        </div>
        <!-- END main-content -->

        <!-- Action History Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h2>Action History</h2>
                <span class="entry-count" id="entry-count">0 entries</span>
            </div>
            <div class="sidebar-content" id="sidebar-content">
                <div class="empty-state">
                    No actions yet. Make corrections and submit to see history here.
                </div>
            </div>
            <button class="btn btn-secondary clear-history-btn" id="clear-history-btn">
                Clear History
            </button>
        </div>
    </div>
    <!-- END container -->

    <script>
        // Action History Management
        class ActionHistory {{
            constructor(storageKey) {{
                this.storageKey = storageKey;
                this.entries = this.load();
                this.render();
            }}

            add(type, message, status = 'success') {{
                const entry = {{
                    timestamp: new Date().toISOString(),
                    type,      // 'correction' | 'retrain'
                    message,
                    status     // 'success' | 'error'
                }};
                this.entries.unshift(entry); // Add to beginning
                this.prune(); // Keep only last 50
                this.save();
                this.render();
                this.scrollToTop();
            }}

            load() {{
                try {{
                    const data = localStorage.getItem(this.storageKey);
                    return data ? JSON.parse(data) : [];
                }} catch (error) {{
                    console.error('Failed to load history:', error);
                    return [];
                }}
            }}

            save() {{
                try {{
                    localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
                }} catch (error) {{
                    console.error('Failed to save history:', error);
                }}
            }}

            prune() {{
                if (this.entries.length > 50) {{
                    this.entries = this.entries.slice(0, 50);
                }}
            }}

            clear() {{
                if (confirm('Clear action history? This cannot be undone.')) {{
                    this.entries = [];
                    this.save();
                    this.render();
                }}
            }}

            render() {{
                const content = document.getElementById('sidebar-content');
                const entryCount = document.getElementById('entry-count');

                if (this.entries.length === 0) {{
                    content.innerHTML = '<div class="empty-state">No actions yet. Make corrections and submit to see history here.</div>';
                    entryCount.textContent = '0 entries';
                    return;
                }}

                const entriesHtml = this.entries.map(entry => {{
                    const icon = this.getIcon(entry.type, entry.status);
                    const timestamp = this.formatTimestamp(entry.timestamp);
                    const errorClass = entry.status === 'error' ? ' error' : '';

                    return `
                        <div class="history-entry${{errorClass}}">
                            <div class="entry-timestamp">${{icon}} ${{timestamp}}</div>
                            <div class="entry-message">${{entry.message}}</div>
                        </div>
                    `;
                }}).join('');

                content.innerHTML = entriesHtml;
                entryCount.textContent = `${{this.entries.length}} ${{this.entries.length === 1 ? 'entry' : 'entries'}}`;
            }}

            getIcon(type, status) {{
                if (status === 'error') return '✗';
                if (type === 'correction') return '📝';
                if (type === 'retrain') return '🔄';
                if (type === 'blocklist') return '🚫';
                return '•';
            }}

            formatTimestamp(isoString) {{
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${{diffMins}} min ago`;

                return date.toLocaleTimeString('en-US', {{
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }});
            }}

            scrollToTop() {{
                const content = document.getElementById('sidebar-content');
                content.scrollTo({{ top: 0, behavior: 'smooth' }});
            }}
        }}

        // Initialize action history
        const storageKey = `action-history-${{window.location.pathname}}`;
        const actionHistory = new ActionHistory(storageKey);

        // Clear history button
        document.getElementById('clear-history-btn').addEventListener('click', () => {{
            actionHistory.clear();
        }});

        // Confidence-based sorting
        function sortImagesByConfidence() {{
            const keepGrid = document.getElementById('keep-grid');
            const excludeGrid = document.getElementById('exclude-grid');

            sortGrid(keepGrid);
            sortGrid(excludeGrid);
        }}

        function sortGrid(grid) {{
            const cards = Array.from(grid.querySelectorAll('.card'));

            // Check if any cards have confidence > 0
            const hasConfidence = cards.some(card =>
                parseFloat(card.dataset.confidence || 0) > 0
            );

            if (!hasConfidence) {{
                // Show warning banner
                showConfidenceWarning();
                return; // Keep original order (by filename)
            }}

            // Sort by confidence (lowest first), then by filename
            cards.sort((a, b) => {{
                const confA = parseFloat(a.dataset.confidence || 0);
                const confB = parseFloat(b.dataset.confidence || 0);

                if (confA !== confB) {{
                    return confA - confB; // Lowest first
                }}

                // Secondary sort by filename
                return a.dataset.filename.localeCompare(b.dataset.filename);
            }});

            // Re-append in sorted order
            cards.forEach(card => grid.appendChild(card));
        }}

        function showConfidenceWarning() {{
            const header = document.querySelector('.header');
            if (!document.getElementById('confidence-warning')) {{
                const warning = document.createElement('div');
                warning.id = 'confidence-warning';
                warning.style.cssText = `
                    background: #7f1d1d;
                    color: #fca5a5;
                    border: 1px solid #ef4444;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 15px;
                `;
                warning.textContent = '⚠️ Confidence data unavailable - images sorted by filename';
                header.appendChild(warning);
            }}
        }}

        // Sort on page load
        sortImagesByConfidence();

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

                // Move card to correct grid
                const targetGrid = newLabel === 'keep'
                    ? document.getElementById('keep-grid')
                    : document.getElementById('exclude-grid');
                targetGrid.appendChild(card);

                // Re-sort the target grid
                sortGrid(targetGrid);

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
                    // Add to history
                    actionHistory.add(
                        'correction',
                        `Submitted ${{result.movedCount}} correction${{result.movedCount === 1 ? '' : 's'}}`,
                        'success'
                    );

                    // Brief toast (2 seconds)
                    showFeedback(`✓ Corrections submitted`, 'success', 2000);

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
                    // Add error to history
                    actionHistory.add(
                        'correction',
                        `Failed to submit: ${{result.error}}`,
                        'error'
                    );

                    // Longer error toast (10 seconds)
                    showFeedback(`✗ Error: ${{result.error}}`, 'error', 10000);
                    submitBtn.disabled = false;
                    submitBtn.textContent = `Submit Corrections (${{modifications.size}})`;
                }}
            }} catch (error) {{
                // Add error to history
                actionHistory.add(
                    'correction',
                    `Failed to submit: ${{error.message}}`,
                    'error'
                );

                showFeedback(`✗ Failed to submit corrections: ${{error.message}}`, 'error', 10000);
                submitBtn.disabled = false;
                submitBtn.textContent = `Submit Corrections (${{modifications.size}})`;
            }}
        }});

        // Retrain model
        retrainBtn.addEventListener('click', async () => {{
            try {{
                retrainBtn.disabled = true;
                retrainBtn.textContent = 'Training...';
                showFeedback('Training model...', 'success', 3000);

                const response = await fetch('/api/retrain', {{
                    method: 'POST'
                }});

                const result = await response.json();

                if (result.success) {{
                    const metrics = result.metrics;
                    const message = `Retrained: ${{metrics.accuracy}} accuracy`;

                    // Add to history
                    actionHistory.add('retrain', message, 'success');

                    // Brief toast
                    showFeedback(`✓ Model retrained successfully`, 'success', 2000);
                }} else {{
                    // Add error to history
                    actionHistory.add(
                        'retrain',
                        `Training failed: ${{result.error}}`,
                        'error'
                    );

                    showFeedback(`✗ Training failed: ${{result.error}}`, 'error', 10000);
                }}
            }} catch (error) {{
                // Add error to history
                actionHistory.add(
                    'retrain',
                    `Training failed: ${{error.message}}`,
                    'error'
                );

                showFeedback(`✗ Failed to retrain: ${{error.message}}`, 'error', 10000);
            }} finally {{
                retrainBtn.disabled = false;
                retrainBtn.textContent = 'Retrain Model';
            }}
        }});

        function showFeedback(message, type, duration = 8000) {{
            feedback.textContent = message;
            feedback.className = `feedback show ${{type}}`;
            setTimeout(() => {{
                feedback.classList.remove('show');
            }}, duration);
        }}

        // Add to blocklist
        async function addToBlocklist(filename, event) {{
            event.stopPropagation(); // Prevent card click toggle

            if (!confirm(`Add ${{filename}} to blocklist? This will prevent it from appearing in future scans.`)) {{
                return;
            }}

            const btn = event.target;
            const card = btn.closest('.card');

            try {{
                btn.disabled = true;
                btn.textContent = 'Adding...';

                const response = await fetch('/api/blocklist', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ filename }})
                }});

                const result = await response.json();

                if (result.success) {{
                    // Add to history
                    actionHistory.add(
                        'blocklist',
                        `Blocklisted: ${{filename}}`,
                        'success'
                    );

                    // Mark card as blocklisted
                    card.classList.add('blocklisted');
                    btn.textContent = '✓ Blocklisted';

                    showFeedback(`✓ Added to blocklist: ${{filename}}`, 'success', 2000);
                }} else {{
                    // Add error to history
                    actionHistory.add(
                        'blocklist',
                        `Failed to blocklist ${{filename}}: ${{result.error}}`,
                        'error'
                    );

                    showFeedback(`✗ Error: ${{result.error}}`, 'error', 10000);
                    btn.disabled = false;
                    btn.textContent = '🚫 Blocklist';
                }}
            }} catch (error) {{
                // Add error to history
                actionHistory.add(
                    'blocklist',
                    `Failed to blocklist ${{filename}}: ${{error.message}}`,
                    'error'
                );

                showFeedback(`✗ Failed to add to blocklist: ${{error.message}}`, 'error', 10000);
                btn.disabled = false;
                btn.textContent = '🚫 Blocklist';
            }}
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
