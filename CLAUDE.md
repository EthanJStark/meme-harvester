# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meme Harvester** - CLI tool for extracting unique still images from videos using FFmpeg's `freezedetect` filter and perceptual hashing. Built with TypeScript as an ESM package.

The CLI command is `harvest`.

**Output Structure:** Files are written to `OUTPUT/<video-name>/<scan-number>/` where scan numbers increment automatically (1, 2, 3...) for each run. This allows comparing results across multiple scans with different parameters.

## Development Commands

```bash
# Build TypeScript to dist/
npm run build

# Run tests (Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Type check (no emit)
npm run lint

# Run CLI in development
npm run dev -- <input.mp4> [options]

# Example: Process video with verbose output (writes to OUTPUT/test/1/)
npm run dev -- test.mp4 --verbose

# Example: Second scan with different parameters (writes to OUTPUT/test/2/)
npm run dev -- test.mp4 --min-freeze 1.0 --verbose

# Example: Custom output directory
npm run dev -- test.mp4 --output ./my-output

# Example: Process video from URL
npm run dev -- --url https://www.youtube.com/watch?v=example --verbose
```

## Architecture

### Output Directory Structure

```
OUTPUT/
├── video-name/
│   ├── 1/              # First scan
│   │   ├── still_0001.jpg
│   │   ├── still_0002.jpg
│   │   └── report.json
│   ├── 2/              # Second scan (different parameters)
│   │   ├── still_0001.jpg
│   │   ├── still_0002.jpg
│   │   └── report.json
│   └── 3/              # Third scan
│       └── ...
└── another-video/
    └── 1/
        └── ...
```

Scan numbers increment automatically based on existing directories. The `OUTPUT/` directory is gitignored.

## Architecture

### Pipeline Flow (src/lib/pipeline.ts)

The main `processVideo()` function executes a sequential pipeline with 5 core stages + 1 optional:

1. **Probe** (`ffmpeg/probe.ts`) - Extract video metadata (duration, streams)
2. **Detect** (`ffmpeg/freezedetect.ts`) - Run FFmpeg freezedetect filter to find still intervals
3. **Extract** (`ffmpeg/extract.ts`) - Extract one frame per interval at calculated timestamp
4. **Hash** (`hash/phash.ts`) - Compute perceptual hash (pHash) using sharp-phash
5. **Deduplicate** (`hash/dedupe.ts`) - Cluster similar frames by Hamming distance
6. **Classify** (`classify/classify.ts`) - *Optional:* ML-based classification (keep vs exclude)

### Module Structure

```
src/
├── cli.ts                    # Commander CLI definition
├── lib/
│   ├── pipeline.ts          # Main orchestration logic
│   ├── types.ts             # Core TypeScript interfaces
│   ├── report.ts            # JSON report generation
│   ├── download/            # URL download via yt-dlp
│   │   └── ytdlp.ts         # yt-dlp subprocess wrapper
│   ├── ffmpeg/              # FFmpeg subprocess wrappers (execa)
│   │   ├── probe.ts         # Video metadata extraction
│   │   ├── freezedetect.ts  # Still interval detection
│   │   └── extract.ts       # Frame extraction & timestamp calc
│   ├── hash/                # Perceptual hashing & deduplication
│   │   ├── phash.ts         # Compute pHash via sharp-phash
│   │   ├── hamming.ts       # Hamming distance calculation
│   │   └── dedupe.ts        # Clustering algorithm
│   └── classify/            # ML-based classification (optional)
│       └── classify.ts      # Python subprocess integration
└── utils/
    ├── fs.ts                # Path & directory utilities
    └── logger.ts            # Console logging wrapper
```

### Key Concepts

- **Freeze Intervals**: Detected by FFmpeg using `noise` (dB threshold) and `minFreeze` (duration threshold)
- **Canonical Frames**: One representative frame per dedupe cluster (marked `isCanonical: true`)
- **Hamming Distance**: Measures bit differences between pHashes for deduplication
- **Report Schema**: Structured JSON output (`Report` interface in types.ts) includes intervals, frames, hashes, and clusters

### FFmpeg Interaction

All FFmpeg operations use `execa` for subprocess execution:
- Pass `-v error` for quiet mode (or omit if `config.verbose`)
- Parse stderr for structured output (freezedetect filter logs)
- Use `-ss` for timestamp seeking, `-frames:v 1` for single frame extraction

### Testing

Tests live in `test/` directory (excluded from TypeScript build). Use Vitest for unit testing hash/hamming logic and utility functions.

## Prerequisites

- **Node.js 24+** (LTS)
- **FFmpeg** must be in PATH with freezedetect support
- **yt-dlp** (optional) - Required only for URL downloads via `--url` option

Validate prerequisites with:
```bash
ffmpeg -version
yt-dlp --version  # Only needed for URL downloads
```

Install yt-dlp: https://github.com/yt-dlp/yt-dlp

## ML Classification (Optional)

The tool includes optional ML-based classification using CLIP embeddings + logistic regression.

**Python components:**
- `python/train_classifier.py` - Train classifier on labeled data
- `python/classify_images.py` - Inference script (called by CLI)
- `models/classifier.pkl` - Trained model (gitignored, user-trained locally)

**Integration:**
- `src/lib/classify/classify.ts` - TypeScript module for subprocess execution
- Classification runs as optional 6th stage in pipeline
- Batch optimization for channel mode (classify all images once)

**Testing:**
- Unit tests: `test/unit/classify.test.ts`
- Manual testing requires trained model (not in CI)
- Graceful fallback ensures tests pass without Python dependencies
