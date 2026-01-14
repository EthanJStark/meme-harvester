# Implementation Plan: Video Still Image Extraction Tool

## Summary

Build a CLI tool (`harvest`) that extracts unique still images from video files using frame differencing for detection and perceptual hashing for deduplication.

## Design Document

See: `llm/designs/2026-01-13-video-still-extraction-design.md`

## Implementation Tasks

### 1. Project Setup
- Initialize npm project with TypeScript
- Configure `tsconfig.json` for Node 24, ES modules
- Install dependencies: `fluent-ffmpeg`, `sharp`, `commander`
- Add npm scripts for build, dev, lint

**Files**: `package.json`, `tsconfig.json`

### 2. Type Definitions
- Define interfaces for: `StillSegment`, `AnalysisResult`, `ReportData`, `CLIOptions`

**Files**: `src/types.ts`

### 3. Frame Analyzer
- Extract frames at configurable sample rate using FFmpeg
- Compare consecutive frames for motion detection
- Identify still segments (sequences below motion threshold)
- Return candidate stills with timestamps

**Files**: `src/analyzer.ts`

### 4. Perceptual Deduplicator
- Implement pHash algorithm using `sharp` for image processing
- Calculate Hamming distance between hashes
- Track seen hashes, skip duplicates
- Return unique stills only

**Files**: `src/deduplicator.ts`

### 5. Report Generator
- Generate JSON report with stills metadata
- Include timestamps, durations, hashes
- Add summary stats (total, duplicates skipped, processing time)

**Files**: `src/reporter.ts`

### 6. CLI Entry Point
- Parse arguments with `commander`
- Wire up analyzer → deduplicator → reporter pipeline
- Handle errors gracefully
- Progress output during processing

**Files**: `src/index.ts`

### 7. Testing
- Unit tests for perceptual hash calculation
- Unit tests for frame difference calculation
- Integration test with sample video

**Files**: `src/__tests__/`

## Verification

1. **Build**: `npm run build` completes without errors
2. **Lint**: `npm run lint` passes
3. **Unit tests**: `npm test` passes
4. **Manual test**: Run against a sample video with known stills
   ```bash
   npx ts-node src/index.ts ./test-video.mp4 --output ./test-output
   ```
5. Verify output contains:
   - Correct number of unique still images
   - `report.json` with valid timestamps
   - No duplicate images extracted

## Dependencies

- Node.js 24 (LTS)
- FFmpeg (system install required)
