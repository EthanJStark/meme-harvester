# Revised Implementation Plan: Meme Harvester (Video Still Image Extraction)

This plan updates the original approach (sampled-frame differencing + custom pHash) by shifting *still detection* into FFmpeg and reusing existing OSS for perceptual hashing. It keeps the same high-level product goal: extract **unique still images** with a **JSON report**.

---

## Goals

- CLI tool named `harvest` that:
  - Detects **frozen / still** spans in video.
  - Extracts representative image(s) for each still span.
  - De-duplicates extracted images (near-identical stills across time) using perceptual hashing.
  - Writes:
    - `./output/stills/*.jpg` (or `.png`)
    - `./output/report.json` with timestamps and dedupe info

Non-goals (for v1):
- Full “best thumbnail” selection for dynamic scenes
- Audio analysis
- GPU acceleration

---

## Architecture Overview (Simpler + More Robust)

### Pipeline

1. **Probe input**
   - Use `ffprobe` for duration, fps, resolution, rotation metadata, stream selection.

2. **Detect still intervals using FFmpeg `freezedetect`**
   - Run FFmpeg with a `freezedetect` filter.
   - Parse its log output (and/or frame metadata) to produce intervals:
     - `freeze_start` (seconds)
     - `freeze_end` (seconds)
   - Output: `FreezeInterval[]`

3. **Extract representative frame(s) per interval**
   - Default: extract **one** frame per interval (midpoint).
   - Optional: extract **two** frames (e.g., 20% and 80%) for extra confidence.

4. **Perceptual hash extracted frames**
   - Use an existing library (recommended):
     - `sharp-phash` (pHash implemented on top of Sharp)
     - or `imghash` (Node perceptual hash toolkit)
   - Store hash + basic image metadata.

5. **De-duplicate**
   - Compute Hamming distance between hashes.
   - Keep one “canonical” image per cluster.
   - Record duplicates as references in the report.

6. **Write outputs**
   - Images: canonical stills only (or optionally keep all and label duplicates).
   - Report: intervals, extracted timestamps, hashes, and dedupe groups.

---

## Key Implementation Details

### 1) Still detection (FFmpeg `freezedetect`)

**Command pattern (example):**
```bash
ffmpeg -hide_banner -i input.mp4 -vf "freezedetect=n=-60dB:d=2" -map 0:v:0 -f null -
```

- `n` (noise threshold): how sensitive the filter is to changes.
- `d` (duration): minimum number of seconds that must remain “still” before logging a freeze.

**Parsing strategy**
- Capture stderr from FFmpeg.
- Parse lines containing `freeze_start` and `freeze_end`.
- Emit `FreezeInterval { startSec, endSec, durationSec }`.

**Config defaults (v1)**
- `d = 2.0` seconds
- `n = -60dB`
- Support CLI overrides.

### 2) Representative timestamp selection

For each interval `[start, end]`:

- If `end` exists: choose `t = (start + end) / 2`
- If `end` is missing (freeze until EOF): choose `t = start + min(1.0, max(0.1, duration/2))` bounded by video duration

### 3) Frame extraction

Extract a single image at timestamp `t`:

```bash
ffmpeg -hide_banner -ss <t> -i input.mp4 -frames:v 1 -q:v 2 output.jpg
```

Notes:
- Prefer `-ss` before `-i` for speed.
- `-q:v` is JPEG quality; if using PNG, omit and use `output.png`.

### 4) Perceptual hashing (reuse OSS)

Recommended options:
- `sharp-phash` (requires `sharp`)
- `imghash`

Store:
- `hash` (hex or binary string)
- `hashAlgo` (e.g. `"phash"`)
- `hashBits` (e.g. 64)

### 5) De-duplication

- Use Hamming distance threshold (default `<= 6` for 64-bit pHash; make configurable).
- Build clusters:
  - simplest: greedy clustering in timestamp order
  - scalable later: LSH / BK-tree (not required for v1)

Output:
- `unique[]`: canonical stills
- `duplicates[]`: entries mapping `duplicateOf` → canonical id and distance

---

## CLI Specification

### Command

```bash
harvest <input...> --output ./output [options]
```

### Options (v1)

- `--output <dir>`: output directory (default `./harvest-output`)
- `--min-freeze <seconds>`: freezedetect `d` (default `2`)
- `--noise <dB>`: freezedetect `n` (default `-60dB`)
- `--format <jpg|png>`: output format (default `jpg`)
- `--hash <phash>`: hashing algorithm (default `phash`)
- `--hash-distance <int>`: Hamming threshold (default `6`)
- `--keep-duplicates`: if set, write duplicate images too (default false)
- `--json <filename>`: report file name (default `report.json`)
- `--verbose`: log FFmpeg commands and parsing

---

## Output Layout

```
output/
  stills/
    <video_basename>/
      still_0001.jpg
      still_0002.jpg
      ...
  report.json
```

---

## `report.json` Schema (v1)

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-13T17:00:00.000Z",
  "inputs": [
    {
      "path": "input.mp4",
      "durationSec": 540.12,
      "videoStream": "0:v:0",
      "freezeDetect": { "noise": "-60dB", "minDurationSec": 2 },
      "intervals": [
        { "id": "int_001", "startSec": 12.3, "endSec": 21.9, "durationSec": 9.6 }
      ],
      "frames": [
        {
          "id": "frm_001",
          "intervalId": "int_001",
          "timestampSec": 17.1,
          "file": "stills/input/still_0001.jpg",
          "hash": "ab12...",
          "hashAlgo": "phash",
          "hashBits": 64,
          "isCanonical": true
        }
      ],
      "dedupe": {
        "clusters": [
          { "canonicalFrameId": "frm_001", "members": ["frm_001", "frm_004"], "maxDistance": 4 }
        ]
      }
    }
  ]
}
```

---

## Implementation Tasks

### 1. Project setup
- TypeScript + Node 24, ES modules
- CLI via `commander`
- Process execution via `execa` (or Node `child_process` with careful stream capture)
- Image I/O via `sharp`
- Hash via **`sharp-phash`** (primary) or `imghash` (fallback)

### 2. FFmpeg integration
- `ffprobe.ts`: extract duration, stream indices, rotation, fps
- `ffmpeg.ts`: helper to run ffmpeg, capture stderr, return exit codes + logs
- `freezedetect.ts`: parse logs → intervals

### 3. Extractor
- `extract.ts`: given (input, timestamp, outputPath), runs frame extraction
- Handle:
  - naming / numbering
  - per-video output subfolder
  - errors (missing stream, decode fail)

### 4. Hash + dedupe
- `hash.ts`: compute pHash for extracted images
- `hamming.ts`: Hamming distance utilities
- `dedupe.ts`: cluster frames and mark canonicals

### 5. Reporting
- `report.ts`: build report object + write pretty JSON
- Include the exact freezedetect parameters used
- Include full command lines if `--verbose` (optional)

### 6. Tests
- Unit tests:
  - log parsing for `freeze_start/end`
  - Hamming distance + dedupe grouping
- Integration tests:
  - run on a short fixture video with known still spans

---

## Acceptance Criteria

1. **Correctness**
   - Detects still segments using `freezedetect` and extracts at least one representative still image per segment.
2. **Deduplication**
   - Near-identical still segments (e.g., repeated title cards) collapse into one canonical output when within hash threshold.
3. **CLI**
   - Works on a single file and multiple inputs.
4. **Artifacts**
   - Produces a stable `report.json` and expected output folder structure.
5. **Repro**
   - `npm test` passes and a sample run produces deterministic output.

---

## Optional Enhancements (post-v1)

### A) Use `mpdecimate` as an alternate “candidate reducer”
In some cases you may want a second mode:
- `--mode freeze` (default): `freezedetect` intervals → frames
- `--mode decimate`: `mpdecimate` reduces redundant frames, then select frames at a target cadence

### B) Keyframe-based thumbnail mode
Add a mode for “best representative frames” of non-still content.

### C) Scale/perf
- Parallelize extraction across intervals
- Caching hashes by file fingerprint
- Faster approximate nearest neighbor for very large batches
