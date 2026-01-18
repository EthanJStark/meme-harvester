#!/usr/bin/env python3
"""
Train image classifier using CLIP embeddings.

Usage:
    python train_classifier.py --data ../training-data --output ../models/classifier.pkl
"""

import argparse
import pickle
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from typing import Tuple, List

import numpy as np
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_validate
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix, classification_report


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


def compute_data_hash(image_paths: List[Path]) -> str:
    """
    Compute hash of training data for versioning.

    Uses file paths and modification times to detect data changes.
    """
    hasher = hashlib.sha256()
    for path in sorted(image_paths):
        hasher.update(str(path).encode())
        hasher.update(str(path.stat().st_mtime).encode())
    return hasher.hexdigest()[:8]


def save_model_metadata(
    output_path: Path,
    data_hash: str,
    metrics: dict,
    training_info: dict
):
    """
    Save model metadata to JSON file alongside the model.

    Args:
        output_path: Path where model was saved (.pkl)
        data_hash: Hash of training data
        metrics: Dictionary of cross-validation metrics
        training_info: Additional training information (image counts, etc.)
    """
    metadata = {
        'version': 1,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'data_hash': data_hash,
        'metrics': metrics,
        'training_info': training_info
    }

    meta_path = output_path.with_suffix('.meta.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Metadata saved to {meta_path}")


def archive_previous_model(output_path: Path):
    """
    Archive existing model to archive/ directory before overwriting.

    Archives both .pkl and .meta.json files if they exist.
    """
    if not output_path.exists():
        return

    # Create archive directory
    archive_dir = output_path.parent / 'archive'
    archive_dir.mkdir(exist_ok=True)

    # Generate archive filename with timestamp
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    archive_name = f"{output_path.stem}_{timestamp}{output_path.suffix}"
    archive_path = archive_dir / archive_name

    # Archive model file
    shutil.copy2(output_path, archive_path)
    print(f"✓ Archived previous model to {archive_path}")

    # Archive metadata if it exists
    meta_path = output_path.with_suffix('.meta.json')
    if meta_path.exists():
        meta_archive_path = archive_dir / f"{output_path.stem}_{timestamp}.meta.json"
        shutil.copy2(meta_path, meta_archive_path)


def main():
    parser = argparse.ArgumentParser(description='Train image classifier using CLIP embeddings')
    parser.add_argument('--data', type=str, required=True, help='Path to training data directory')
    parser.add_argument('--output', type=str, required=True, help='Path to save trained model (.pkl)')
    parser.add_argument('--device', type=str, default='cpu', help='Device to use (cpu or cuda)')
    parser.add_argument('--dry-run', action='store_true', help='Evaluate model without saving')
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

    # Check for class imbalance
    keep_count = np.sum(labels == 0)
    exclude_count = np.sum(labels == 1)
    class_ratio = max(keep_count, exclude_count) / max(min(keep_count, exclude_count), 1)

    if class_ratio > 2.0:
        print(f"\n⚠️  WARNING: Class imbalance detected!")
        print(f"   Keep: {keep_count} images, Exclude: {exclude_count} images")
        print(f"   Ratio: {class_ratio:.1f}:1")
        print(f"   Consider collecting more data for the minority class.\n")

    print(f"\nPerforming 5-fold cross-validation...")
    classifier = LogisticRegression(max_iter=1000, random_state=42)

    # Cross-validation with multiple metrics
    cv_results = cross_validate(
        classifier,
        embeddings,
        labels,
        cv=5,
        scoring=['accuracy', 'precision', 'recall', 'f1'],
        return_train_score=False
    )

    # Calculate mean and std for each metric
    accuracy_mean = cv_results['test_accuracy'].mean()
    accuracy_std = cv_results['test_accuracy'].std()
    precision_mean = cv_results['test_precision'].mean()
    precision_std = cv_results['test_precision'].std()
    recall_mean = cv_results['test_recall'].mean()
    recall_std = cv_results['test_recall'].std()
    f1_mean = cv_results['test_f1'].mean()
    f1_std = cv_results['test_f1'].std()

    print(f"\n{'='*50}")
    print(f"CROSS-VALIDATION RESULTS (5-fold):")
    print(f"{'='*50}")
    print(f"Accuracy:  {accuracy_mean:.3f} (+/- {accuracy_std:.3f})")
    print(f"Precision: {precision_mean:.3f} (+/- {precision_std:.3f})")
    print(f"Recall:    {recall_mean:.3f} (+/- {recall_std:.3f})")
    print(f"F1-Score:  {f1_mean:.3f} (+/- {f1_std:.3f})")

    # Train on full dataset for final model
    print(f"\nTraining final model on full dataset ({len(embeddings)} images)...")
    classifier.fit(embeddings, labels)

    # Generate per-class metrics using a held-out test set
    print(f"\nEvaluating per-class performance (80/20 split)...")
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, labels, test_size=0.2, random_state=42, stratify=labels
    )

    temp_classifier = LogisticRegression(max_iter=1000, random_state=42)
    temp_classifier.fit(X_train, y_train)
    y_pred = temp_classifier.predict(X_test)

    print(f"\nPer-Class Metrics:")
    print(classification_report(
        y_test,
        y_pred,
        target_names=['keep', 'exclude'],
        digits=3
    ))

    cm = confusion_matrix(y_test, y_pred)
    print(f"Confusion Matrix:")
    print(f"                 Predicted")
    print(f"               Keep  Exclude")
    print(f"Actual Keep    {cm[0][0]:4d}  {cm[0][1]:4d}")
    print(f"       Exclude {cm[1][0]:4d}  {cm[1][1]:4d}")
    print(f"{'='*50}")

    # Compute training data hash for versioning
    data_hash = compute_data_hash(image_paths)

    # Collect metrics and training info
    metrics = {
        'accuracy_mean': float(accuracy_mean),
        'accuracy_std': float(accuracy_std),
        'precision_mean': float(precision_mean),
        'precision_std': float(precision_std),
        'recall_mean': float(recall_mean),
        'recall_std': float(recall_std),
        'f1_mean': float(f1_mean),
        'f1_std': float(f1_std)
    }

    training_info = {
        'total_images': len(image_paths),
        'keep_count': int(keep_count),
        'exclude_count': int(exclude_count),
        'class_ratio': float(class_ratio)
    }

    # Save model (unless dry-run)
    if args.dry_run:
        print(f"\n🔍 DRY RUN: Model evaluation complete (not saved)")
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Archive previous model if it exists
        archive_previous_model(output_path)

        # Save new model
        with open(output_path, 'wb') as f:
            pickle.dump(classifier, f)
        print(f"\n✓ Model saved to {output_path}")

        # Save metadata
        save_model_metadata(output_path, data_hash, metrics, training_info)


if __name__ == '__main__':
    main()
