# Meme Harvester

CLI tool to extract unique still images from videos using FFmpeg's freezedetect filter and perceptual hashing.

## Features

- **Automatic still detection**: Uses FFmpeg's `freezedetect` to identify frozen/still segments
- **Smart deduplication**: Perceptual hashing (pHash) clusters similar stills
- **Detailed reporting**: JSON output with intervals, timestamps, hashes, and dedupe info
- **Configurable**: Tune freeze detection sensitivity, output format, and hash thresholds

## Installation

### Prerequisites

- **Node.js 24+** (LTS)
- **FFmpeg** with `freezedetect` filter ([installation guide](https://ffmpeg.org/download.html))

### Install

```bash
npm install -g meme-harvester
```

Or run directly:

```bash
npx meme-harvester video.mp4
```

## Usage

### Basic

```bash
harvest video.mp4
```

Outputs to `./meme-harvester-output/`:
- `stills/video/*.jpg` - Extracted still images
- `report.json` - Processing report with metadata

### Options

```
harvest <input...> [options]

Arguments:
  input                  Input video file(s)

Options:
  --output <dir>         Output directory (default: ./harvest-output)
  --min-freeze <sec>     Minimum freeze duration in seconds (default: 0.5)
  --noise <dB>           Freeze detection noise threshold (default: -60dB)
  --format <jpg|png>     Output image format (default: jpg)
  --hash-distance <int>  Hamming distance threshold for deduplication (default: 6)
  --keep-duplicates      Write duplicate images (default: false)
  --json <filename>      Report filename (default: report.json)
  --verbose              Log detailed FFmpeg commands and output
  -h, --help             Display help
  -V, --version          Display version
```

### Examples

**Process multiple videos:**
```bash
harvest video1.mp4 video2.mp4 --output ./output
```

**High sensitivity detection (shorter freezes):**
```bash
harvest video.mp4 --min-freeze 1 --noise -50dB
```

**PNG output with loose deduplication:**
```bash
harvest video.mp4 --format png --hash-distance 10
```

**Verbose mode for debugging:**
```bash
harvest video.mp4 --verbose
```

## Report Schema

The `report.json` follows this structure:

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-13T12:00:00.000Z",
  "inputs": [
    {
      "path": "video.mp4",
      "durationSec": 120.5,
      "videoStream": "0:v:0",
      "freezeDetect": {
        "noise": "-60dB",
        "minDurationSec": 2
      },
      "intervals": [
        {
          "id": "int_001",
          "startSec": 10.0,
          "endSec": 20.0,
          "durationSec": 10.0
        }
      ],
      "frames": [
        {
          "id": "frm_001",
          "intervalId": "int_001",
          "timestampSec": 15.0,
          "file": "stills/video/still_0001.jpg",
          "hash": "abc123...",
          "hashAlgo": "phash",
          "hashBits": 64,
          "isCanonical": true
        }
      ],
      "dedupe": {
        "clusters": [
          {
            "canonicalFrameId": "frm_001",
            "members": ["frm_001", "frm_004"],
            "maxDistance": 4
          }
        ]
      }
    }
  ]
}
```

## How It Works

1. **Probe**: Extract video metadata (duration, streams, resolution)
2. **Detect**: Run FFmpeg's `freezedetect` filter to find still intervals
3. **Extract**: Extract one frame per interval at midpoint timestamp
4. **Hash**: Compute perceptual hash (pHash) for each frame
5. **Deduplicate**: Cluster frames by Hamming distance threshold
6. **Output**: Write canonical stills and JSON report

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm run dev -- test.mp4 --verbose
```

## License

MIT
