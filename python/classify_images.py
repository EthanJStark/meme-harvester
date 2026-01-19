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
import numpy as np
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

# Global cache for CLIP model (lazy-loaded)
_clip_model = None
_clip_processor = None
_device = None

def get_clip_model():
    """Lazy-load and cache CLIP model"""
    global _clip_model, _clip_processor, _device

    if _clip_model is None:
        print("Loading CLIP model...", file=sys.stderr)
        _device = 'cuda' if torch.cuda.is_available() else 'cpu'
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model.to(_device)
        _clip_model.eval()

    return _clip_model, _clip_processor, _device

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

    # Get all .jpg and .png files (recursively search subdirectories)
    image_paths = sorted(list(image_dir.glob('**/*.jpg')) + list(image_dir.glob('**/*.png')))
    if not image_paths:
        print(f"Error: No images found in {image_dir}", file=sys.stderr)
        sys.exit(1)

    return image_paths

def get_embeddings(image_paths):
    """
    Generate CLIP embeddings for images.

    Args:
        image_paths: List of Path objects to image files

    Returns:
        numpy array of embeddings (N x 512)
    """
    model, processor, device = get_clip_model()
    embeddings = []

    for img_path in image_paths:
        try:
            # Load and preprocess image
            image = Image.open(img_path).convert('RGB')
            inputs = processor(images=image, return_tensors="pt").to(device)

            # Extract features
            with torch.no_grad():
                image_features = model.get_image_features(**inputs)

            # Normalize to unit vector
            embedding = image_features.cpu().numpy()[0]
            embedding = embedding / np.linalg.norm(embedding)
            embeddings.append(embedding)

        except Exception as e:
            print(f"Warning: Failed to process {img_path}: {e}", file=sys.stderr)
            # Use zero vector as fallback for failed images
            embeddings.append(np.zeros(512))

    return np.array(embeddings)

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
            'label': 'keep' if pred == 0 else 'exclude',
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
