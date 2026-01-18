#!/usr/bin/env python3
"""
Classify images using trained CLIP classifier.

Usage:
    python classify_images.py <directory>       # Recursively find all .jpg/.png
    echo "img1.jpg\nimg2.jpg" | python classify_images.py --stdin

Output: JSON array to stdout
[
  {"path": "img1.jpg", "label": "keep", "confidence": 0.92},
  {"path": "img2.jpg", "label": "exclude", "confidence": 0.78}
]

Exit codes:
    0 - Success
    1 - Model file not found or loading error
    2 - Dependency error (CLIP model download failed)
"""

import argparse
import json
import pickle
import sys
from pathlib import Path
from typing import List, Dict

import numpy as np
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel


def extract_embedding(
    image_path: Path,
    model: CLIPModel,
    processor: CLIPProcessor,
    device: str
) -> np.ndarray:
    """Extract normalized CLIP embedding for a single image."""
    image = Image.open(image_path).convert('RGB')
    inputs = processor(images=image, return_tensors="pt").to(device)

    with torch.no_grad():
        image_features = model.get_image_features(**inputs)

    embedding = image_features.cpu().numpy()[0]
    embedding = embedding / np.linalg.norm(embedding)
    return embedding


def classify_images(
    image_paths: List[Path],
    classifier,
    model: CLIPModel,
    processor: CLIPProcessor,
    device: str
) -> List[Dict]:
    """
    Classify a batch of images.

    Returns list of classification results:
    [{"path": str, "label": str, "confidence": float}, ...]
    """
    results = []

    for img_path in image_paths:
        try:
            # Extract embedding
            embedding = extract_embedding(img_path, model, processor, device)

            # Classify
            prediction = classifier.predict([embedding])[0]
            proba = classifier.predict_proba([embedding])[0]

            # Map prediction to label
            label = 'keep' if prediction == 0 else 'exclude'
            confidence = float(proba[prediction])

            results.append({
                'path': str(img_path),
                'label': label,
                'confidence': confidence
            })

        except Exception as e:
            # Log to stderr, return null result
            print(f"Error processing {img_path}: {e}", file=sys.stderr)
            results.append({
                'path': str(img_path),
                'label': None,
                'confidence': 0.0
            })

    return results


def find_images(directory: Path) -> List[Path]:
    """Recursively find all .jpg and .png images in directory."""
    images = []
    images.extend(directory.rglob('*.jpg'))
    images.extend(directory.rglob('*.jpeg'))
    images.extend(directory.rglob('*.png'))
    return sorted(images)


def main():
    parser = argparse.ArgumentParser(description='Classify images using trained CLIP classifier')
    parser.add_argument('directory', nargs='?', help='Directory containing images to classify')
    parser.add_argument('--stdin', action='store_true', help='Read image paths from stdin (one per line)')
    parser.add_argument('--model', type=str, default='models/classifier.pkl', help='Path to trained classifier')
    parser.add_argument('--device', type=str, default='cpu', help='Device to use (cpu or cuda)')
    args = parser.parse_args()

    # Load trained classifier
    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Error: Model file not found: {model_path}", file=sys.stderr)
        print("Run train_classifier.py first to create the model.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(model_path, 'rb') as f:
            classifier = pickle.load(f)
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

    # Load CLIP model
    try:
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model.to(args.device)
        model.eval()
    except Exception as e:
        print(f"Error loading CLIP model: {e}", file=sys.stderr)
        print("This may be due to missing dependencies or network issues.", file=sys.stderr)
        sys.exit(2)

    # Get image paths
    if args.stdin:
        image_paths = [Path(line.strip()) for line in sys.stdin if line.strip()]
    elif args.directory:
        directory = Path(args.directory)
        if not directory.exists():
            print(f"Error: Directory not found: {directory}", file=sys.stderr)
            sys.exit(1)
        image_paths = find_images(directory)
    else:
        print("Error: Must specify directory or use --stdin", file=sys.stderr)
        sys.exit(1)

    if len(image_paths) == 0:
        print("Warning: No images found", file=sys.stderr)
        print("[]")
        sys.exit(0)

    # Classify images
    results = classify_images(image_paths, classifier, model, processor, args.device)

    # Output JSON to stdout
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
