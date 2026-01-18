#!/usr/bin/env python3
"""
Train image classifier using CLIP embeddings.

Usage:
    python train_classifier.py --data ../training-data --output ../models/classifier.pkl
"""

import argparse
import pickle
from pathlib import Path
from typing import Tuple, List

import numpy as np
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix


def extract_clip_embeddings(
    image_paths: List[Path],
    model: CLIPModel,
    processor: CLIPProcessor,
    device: str
) -> np.ndarray:
    """
    Extract CLIP embeddings for a list of images.

    Args:
        image_paths: List of paths to image files
        model: CLIP model
        processor: CLIP processor
        device: Device to run inference on ('cpu' or 'cuda')

    Returns:
        numpy array of embeddings (N x embedding_dim)
    """
    embeddings = []

    for img_path in image_paths:
        try:
            image = Image.open(img_path).convert('RGB')
            inputs = processor(images=image, return_tensors="pt").to(device)

            with torch.no_grad():
                image_features = model.get_image_features(**inputs)

            # Normalize embedding
            embedding = image_features.cpu().numpy()[0]
            embedding = embedding / np.linalg.norm(embedding)
            embeddings.append(embedding)

        except Exception as e:
            print(f"Warning: Failed to process {img_path}: {e}")
            continue

    return np.array(embeddings)


def load_labeled_data(data_dir: Path) -> Tuple[List[Path], List[int]]:
    """
    Load labeled images from directory structure.

    Expected structure:
        data_dir/
            keep/       # Label 0
                *.jpg
            exclude/    # Label 1
                *.jpg

    Returns:
        (image_paths, labels) tuple
    """
    image_paths = []
    labels = []

    # Load 'keep' images (label 0)
    keep_dir = data_dir / 'keep'
    if keep_dir.exists():
        keep_images = list(keep_dir.glob('*.jpg')) + list(keep_dir.glob('*.png'))
        image_paths.extend(keep_images)
        labels.extend([0] * len(keep_images))
        print(f"Loaded {len(keep_images)} 'keep' images")

    # Load 'exclude' images (label 1)
    exclude_dir = data_dir / 'exclude'
    if exclude_dir.exists():
        exclude_images = list(exclude_dir.glob('*.jpg')) + list(exclude_dir.glob('*.png'))
        image_paths.extend(exclude_images)
        labels.extend([1] * len(exclude_images))
        print(f"Loaded {len(exclude_images)} 'exclude' images")

    if len(image_paths) == 0:
        raise ValueError(f"No images found in {data_dir}")

    return image_paths, labels


def main():
    parser = argparse.ArgumentParser(description='Train image classifier using CLIP embeddings')
    parser.add_argument('--data', type=str, required=True, help='Path to training data directory')
    parser.add_argument('--output', type=str, required=True, help='Path to save trained model (.pkl)')
    parser.add_argument('--device', type=str, default='cpu', help='Device to use (cpu or cuda)')
    args = parser.parse_args()

    data_dir = Path(args.data)
    output_path = Path(args.output)

    print("Loading CLIP model...")
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    model.to(args.device)
    model.eval()

    print(f"\nLoading training data from {data_dir}...")
    image_paths, labels = load_labeled_data(data_dir)
    labels = np.array(labels)

    print(f"\nExtracting CLIP embeddings for {len(image_paths)} images...")
    embeddings = extract_clip_embeddings(image_paths, model, processor, args.device)

    if len(embeddings) != len(labels):
        print(f"Warning: Some images failed to process. Using {len(embeddings)}/{len(labels)} images")
        # This shouldn't happen with our error handling, but be safe

    print(f"\nSplitting data (80/20 train/test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, labels, test_size=0.2, random_state=42, stratify=labels
    )

    print(f"Training set: {len(X_train)} images")
    print(f"Test set: {len(X_test)} images")

    print(f"\nTraining logistic regression classifier...")
    classifier = LogisticRegression(max_iter=1000, random_state=42)
    classifier.fit(X_train, y_train)

    print(f"\nEvaluating on test set...")
    y_pred = classifier.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"RESULTS:")
    print(f"{'='*50}")
    print(f"Accuracy:  {accuracy:.3f}")
    print(f"Precision: {precision:.3f}")
    print(f"Recall:    {recall:.3f}")
    print(f"\nConfusion Matrix:")
    print(f"                 Predicted")
    print(f"               Keep  Exclude")
    print(f"Actual Keep    {cm[0][0]:4d}  {cm[0][1]:4d}")
    print(f"       Exclude {cm[1][0]:4d}  {cm[1][1]:4d}")
    print(f"{'='*50}")

    # Save model
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'wb') as f:
        pickle.dump(classifier, f)

    print(f"\n✓ Model saved to {output_path}")


if __name__ == '__main__':
    main()
