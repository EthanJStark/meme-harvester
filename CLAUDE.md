# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meme Harvester** - CLI tool for extracting unique still images from videos using FFmpeg's `freezedetect` filter and perceptual hashing. Built with TypeScript as an ESM package.

The CLI command is `harvest`.

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

# Example: Process video with verbose output
npm run dev -- test.mp4 --verbose --output ./out
```

## Architecture

### Pipeline Flow (src/lib/pipeline.ts)

The main `processVideo()` function executes a 5-stage sequential pipeline:

1. **Probe** (`ffmpeg/probe.ts`) - Extract video metadata (duration, streams)
2. **Detect** (`ffmpeg/freezedetect.ts`) - Run FFmpeg freezedetect filter to find still intervals
3. **Extract** (`ffmpeg/extract.ts`) - Extract one frame per interval at calculated timestamp
4. **Hash** (`hash/phash.ts`) - Compute perceptual hash (pHash) using sharp-phash
5. **Deduplicate** (`hash/dedupe.ts`) - Cluster similar frames by Hamming distance

### Module Structure

```
src/
├── cli.ts                    # Commander CLI definition
├── lib/
│   ├── pipeline.ts          # Main orchestration logic
│   ├── types.ts             # Core TypeScript interfaces
│   ├── report.ts            # JSON report generation
│   ├── ffmpeg/              # FFmpeg subprocess wrappers (execa)
│   │   ├── probe.ts         # Video metadata extraction
│   │   ├── freezedetect.ts  # Still interval detection
│   │   └── extract.ts       # Frame extraction & timestamp calc
│   └── hash/                # Perceptual hashing & deduplication
│       ├── phash.ts         # Compute pHash via sharp-phash
│       ├── hamming.ts       # Hamming distance calculation
│       └── dedupe.ts        # Clustering algorithm
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

Validate FFmpeg availability with: `ffmpeg -version`
