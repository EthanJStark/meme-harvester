#!/usr/bin/env python3
"""
Classify images using trained CLIP-based classifier.

Usage:
    python classify_images.py <image_directory>

Output:
    JSON array of classification results with confidence scores
"""

import sys
import json
from pathlib import Path
import pickle

def load_model(model_path='models/classifier.pkl'):
    """Load trained classifier model"""
    if not Path(model_path).exists():
        print(f"Error: Model file not found at {model_path}", file=sys.stderr)
        sys.exit(1)

    with open(model_path, 'rb') as f:
        return pickle.load(f)

def load_images(image_dir):
    """Load all images from directory"""
    image_dir = Path(image_dir)
    if not image_dir.exists():
        print(f"Error: Directory not found: {image_dir}", file=sys.stderr)
        sys.exit(1)

    # Get all .jpg and .png files
    image_paths = sorted(list(image_dir.glob('*.jpg')) + list(image_dir.glob('*.png')))
    if not image_paths:
        print(f"Error: No images found in {image_dir}", file=sys.stderr)
        sys.exit(1)

    return image_paths

def get_embeddings(image_paths):
    """
    Generate CLIP embeddings for images.

    Note: This is a placeholder. In a real implementation, this would:
    1. Load CLIP model
    2. Preprocess images
    3. Generate embeddings

    For now, returns dummy embeddings for testing.
    """
    try:
        import numpy as np
        # Placeholder: return random embeddings for testing
        # In production, use actual CLIP model here
        return np.random.randn(len(image_paths), 512)
    except ImportError:
        print("Error: numpy not installed", file=sys.stderr)
        sys.exit(2)

def classify_images(image_dir):
    """Classify all images in directory and return results with confidence"""
    # Load model
    model = load_model()

    # Load images
    image_paths = load_images(image_dir)

    # Get embeddings (CLIP features)
    embeddings = get_embeddings(image_paths)

    # Predict labels and probabilities
    predictions = model.predict(embeddings)
    probabilities = model.predict_proba(embeddings)

    # Build results with confidence
    results = []
    for i, (img_path, pred) in enumerate(zip(image_paths, predictions)):
        confidence = float(probabilities[i][pred])  # Confidence for predicted class
        results.append({
            'path': str(img_path),  # Full path for matching with TypeScript
            'label': 'keep' if pred == 1 else 'exclude',
            'confidence': confidence
        })

    return results

def main():
    if len(sys.argv) != 2:
        print("Usage: python classify_images.py <image_directory>", file=sys.stderr)
        sys.exit(1)

    image_dir = sys.argv[1]

    try:
        results = classify_images(image_dir)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
