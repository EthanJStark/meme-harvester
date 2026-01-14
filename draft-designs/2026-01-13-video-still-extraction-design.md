# Video Still Image Extraction Tool - Design Document

## Overview

CLI tool that scans video files to identify and extract static/frozen frames (slides, graphics, title cards) while deduplicating similar images.

## Requirements

- **Input**: Video files (MP4, etc.) up to ~15 minutes
- **Detect**: Completely frozen frames and inserted graphics/slides
- **Output**: Unique PNG images + JSON report with timestamps
- **Deduplication**: Perceptual hashing (first occurrence only)
- **Interface**: CLI tool
- **Tech Stack**: TypeScript + FFmpeg

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frame Analysis │ ──▶ │  Deduplication  │ ──▶ │  Output         │
│                 │     │                 │     │                 │
│ • Extract frames│     │ • Perceptual    │     │ • Save unique   │
│ • Detect frozen │     │   hash each     │     │   images        │
│   sequences     │     │ • Group similar │     │ • Generate      │
│                 │     │ • Keep first    │     │   report.json   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Still Detection Algorithm

Frame differencing with threshold:

```
For each pair of consecutive frames (F[n], F[n+1]):
  1. Calculate difference score (mean absolute pixel difference)
  2. If diff < threshold → frames are "same" (still continues)
  3. If diff > threshold → frames are "different" (motion detected)

A "still segment" = consecutive frames where diff stays below threshold
```

### Parameters (CLI flags)

| Flag | Default | Description |
|------|---------|-------------|
| `--sample-rate` | 2 | Frames per second to analyze |
| `--min-duration` | 1.0 | Minimum seconds to qualify as still |
| `--motion-threshold` | auto | Sensitivity for detecting change |
| `--format` | png | Output image format |
| `--output` | ./stills | Output directory |

### Why 2 fps default?

- 15-min video at 30fps = 27,000 frames
- At 2 fps = 1,800 frames to analyze
- Still detects stills ≥0.5 seconds
- 15x faster while catching meaningful stills

## Perceptual Deduplication

Using perceptual hashing (pHash):

```
Image → Resize to 8x8 → Convert to grayscale →
        Calculate DCT → Keep top-left 8x8 →
        Generate 64-bit hash based on median
```

**Comparison**: Hamming distance
- Distance 0-5: Same image (duplicates)
- Distance 6-10: Edge cases
- Distance 11+: Different images

## CLI Interface

```bash
# Basic usage
harvest ./video.mp4

# With options
harvest ./video.mp4 \
  --output ./stills \
  --sample-rate 2 \
  --min-duration 1.0 \
  --format png

# Multiple files
harvest ./video1.mp4 ./video2.mp4 --output ./all-stills
```

## Output Format

### Directory Structure

```
./stills/
├── still-001.png
├── still-002.png
├── still-003.png
└── report.json
```

### report.json

```json
{
  "source": "video.mp4",
  "duration": "15:32",
  "analyzedAt": "2026-01-13T10:30:00Z",
  "parameters": {
    "sampleRate": 2,
    "minDuration": 1.0,
    "motionThreshold": 0.02
  },
  "stills": [
    {
      "file": "still-001.png",
      "timestamp": "00:00:30",
      "duration": "5.5s",
      "hash": "a1b2c3d4..."
    }
  ],
  "summary": {
    "totalStills": 2,
    "duplicatesSkipped": 1,
    "processingTime": "12.3s"
  }
}
```

## Project Structure

```
harvest/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── analyzer.ts       # Frame extraction & still detection
│   ├── deduplicator.ts   # Perceptual hashing & comparison
│   ├── reporter.ts       # JSON report generation
│   └── types.ts          # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

- `fluent-ffmpeg` - FFmpeg wrapper for frame extraction
- `sharp` - Image processing (resize, grayscale for hashing)
- `commander` - CLI argument parsing
- TypeScript dev dependencies

## System Requirements

- Node.js 24+ (LTS)
- FFmpeg installed on system
