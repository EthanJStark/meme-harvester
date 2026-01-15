# Meme Harvester

![Meme Harvester Example](harvest.png)

Do you find yourself enjoying a video that's simply chock-full of memes, flashing past, before you can rewind and pause to read the text? No longer!

Meme Harvester automatically extracts every unique still image from videos - perfect for meme compilations, TikTok videos, or any content with rapid-fire images.

## What is This?

A command-line tool that watches videos and saves every unique still frame as an image. It uses:

- **FFmpeg's freezedetect** to find moments where the video pauses or holds still
- **Perceptual hashing** to filter out duplicates (even if slightly different)
- **yt-dlp** to download videos directly from YouTube, TikTok, Instagram, and 1000+ sites

**What you get:**
- A folder of unique still images (JPEG or PNG)
- A detailed report showing when each image appeared
- Smart deduplication so you don't get 50 copies of the same meme

No video editing software needed - just point it at a video URL or file and go!

## Getting Started

Follow these three steps to start harvesting memes:

### Step 1: Install Prerequisites

Meme Harvester needs two free tools to work:

#### FFmpeg (Required)
Processes video files and extracts frames.

#### yt-dlp (Highly Recommended)
Downloads videos from YouTube, TikTok, Instagram, and 1000+ sites. Skip this if you only process local video files.

---

**📦 Installation by Platform:**

<details open>
<summary><b>macOS</b></summary>

Using Homebrew (recommended):
```bash
# Install both tools
brew install ffmpeg yt-dlp
```

**Don't have Homebrew?** Install it first: https://brew.sh

Verify installation:
```bash
ffmpeg -version
yt-dlp --version
```
</details>

<details>
<summary><b>Windows</b></summary>

**Option 1: Using winget (Windows 10/11, recommended)**
```powershell
# Install both tools
winget install ffmpeg
winget install yt-dlp
```

**Option 2: Manual installation**
1. Download FFmpeg: https://ffmpeg.org/download.html#build-windows
2. Download yt-dlp: https://github.com/yt-dlp/yt-dlp/releases (get `yt-dlp.exe`)
3. Add both to your PATH (search "Environment Variables" in Start Menu)

Verify installation (restart terminal first):
```powershell
ffmpeg -version
yt-dlp --version
```
</details>

<details>
<summary><b>Linux</b></summary>

**Debian/Ubuntu:**
```bash
sudo apt update
sudo apt install ffmpeg yt-dlp
```

**Fedora/RHEL:**
```bash
sudo dnf install ffmpeg yt-dlp
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg yt-dlp
```

Verify installation:
```bash
ffmpeg -version
yt-dlp --version
```
</details>

---

### Step 2: Download Meme Harvester

**Go to the releases page:** https://github.com/EthanJStark/meme-harvester/releases

**Download the right file for your system:**

| Platform | File to Download |
|----------|-----------------|
| macOS (Apple Silicon - M1/M2/M3/M4) | `harvest-macos-arm64.tar.gz` |
| macOS (Intel) | `harvest-macos-x64.tar.gz` |
| Windows | `harvest-win-x64.zip` |
| Linux | `harvest-linux-x64.tar.gz` |

**Not sure which Mac you have?** Click the Apple logo → "About This Mac". If it says M1, M2, M3, or M4, use `arm64`. If it says Intel, use `x64`.

---

### Step 3: Extract and Run

<details open>
<summary><b>macOS / Linux</b></summary>

```bash
# Extract the archive
tar -xzf harvest-macos-arm64.tar.gz

# Make it executable (if needed)
chmod +x harvest-macos-arm64/harvest

# Run it!
./harvest-macos-arm64/harvest --help
```

**Optional: Add to PATH** (so you can type `harvest` from anywhere)
```bash
# Move to a location in your PATH
mv harvest-macos-arm64/harvest /usr/local/bin/harvest

# Or add to your shell config (~/.zshrc or ~/.bashrc)
export PATH="$PATH:/path/to/harvest-macos-arm64"
```
</details>

<details>
<summary><b>Windows</b></summary>

1. Right-click `harvest-win-x64.zip` → "Extract All"
2. Open the extracted folder
3. Open Command Prompt or PowerShell in that folder (Shift + Right-click → "Open PowerShell here")
4. Run:
```powershell
.\harvest.exe --help
```

**Optional: Add to PATH** (so you can type `harvest` from anywhere)
- Search "Environment Variables" in Start Menu
- Click "Environment Variables" button
- Under "User variables", select "Path" and click "Edit"
- Click "New" and add the full path to your harvest folder
- Click OK, restart your terminal
</details>

---

### ✅ Verify Everything Works

Run this test command:
```bash
harvest --version
```

You should see the version number. You're ready to harvest! 🎉

## Usage Examples

### Quick Start: Download & Extract from URL

This is the most common way to use Meme Harvester:

```bash
# Download a video and extract all unique stills
harvest --url "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

That's it! The tool will:
1. Download the video using yt-dlp
2. Find all the still frames
3. Remove duplicates
4. Save unique images to `OUTPUT/video-title/1/`

**What you get:**
```
OUTPUT/
└── video-title/
    └── 1/
        ├── still_0001.jpg
        ├── still_0002.jpg
        ├── still_0003.jpg
        └── report.json
```

---

### More URL Examples

```bash
# TikTok video
harvest --url "https://www.tiktok.com/@user/video/1234567890"

# Instagram
harvest --url "https://www.instagram.com/p/ABC123/"

# Any of 1000+ supported sites
harvest --url "https://example.com/video"
```

**Tip:** If a site is supported by yt-dlp, it works with Meme Harvester! See the full list: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md

---

### Process Local Video Files

Already have a video file? Use it directly:

```bash
# Process a local file
harvest myvideo.mp4

# Output goes to OUTPUT/myvideo/1/
```

**Multiple files at once:**
```bash
harvest video1.mp4 video2.mp4 video3.mp4
```

---

### Multiple Scans with Different Settings

Each time you run the tool on the same video, it creates a new scan folder:

```bash
# First scan - default settings
harvest myvideo.mp4
# → OUTPUT/myvideo/1/

# Second scan - more sensitive (catches shorter stills)
harvest myvideo.mp4 --min-freeze 0.3
# → OUTPUT/myvideo/2/

# Third scan - less sensitive (only longer stills)
harvest myvideo.mp4 --min-freeze 2.0
# → OUTPUT/myvideo/3/
```

This lets you compare results and find the best settings for your video!

---

### Customize Output

```bash
# Custom output directory
harvest --url "..." --output ./my-memes

# Save as PNG instead of JPG
harvest --url "..." --format png

# Keep duplicate images (no deduplication)
harvest --url "..." --keep-duplicates

# See detailed progress and FFmpeg commands
harvest --url "..." --verbose
```

---

### Fine-tune Detection

```bash
# Catch shorter freezes (more sensitive, more images)
harvest --url "..." --min-freeze 0.3

# Only longer freezes (less sensitive, fewer images)
harvest --url "..." --min-freeze 2.0

# Adjust deduplication sensitivity
# Lower = stricter (fewer duplicates), Higher = looser (more variations)
harvest --url "..." --hash-distance 4   # Stricter
harvest --url "..." --hash-distance 10  # Looser
```

---

### Understanding the Output

After processing, you'll find:

**📁 Image Files**
- `still_0001.jpg`, `still_0002.jpg`, etc.
- Only unique/canonical images (duplicates removed by default)
- Numbered in the order they appear in the video

**📄 report.json**
- Detailed processing information
- Timestamps for each image
- Deduplication clusters
- Video metadata

**Example report.json snippet:**
```json
{
  "version": "1.0",
  "inputs": [{
    "path": "video.mp4",
    "durationSec": 120.5,
    "frames": [
      {
        "id": "frm_001",
        "timestampSec": 15.0,
        "file": "still_0001.jpg",
        "isCanonical": true
      }
    ]
  }]
}
```

## Troubleshooting

### "harvest: command not found" or "harvest is not recognized"

**Problem:** Your terminal can't find the harvest command.

**Solution:**
- Run harvest using the full path: `./harvest-macos-arm64/harvest` (adjust for your platform)
- OR add it to your PATH (see Step 3 in Getting Started)
- Make sure you're in the correct directory where you extracted the files

---

### "ffmpeg: command not found" or "yt-dlp: command not found"

**Problem:** Required tools aren't installed or not in PATH.

**Solution:**
1. Verify installation: `ffmpeg -version` and `yt-dlp --version`
2. If not found, return to Step 1 in Getting Started
3. After installing, **restart your terminal** for PATH changes to take effect
4. On Windows, you may need to restart your computer

---

### "ERROR: Unsupported URL" when using --url

**Problem:** yt-dlp can't download from this site.

**Solution:**
- Check if the site is supported: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
- Try updating yt-dlp: `brew upgrade yt-dlp` (macOS) or `winget upgrade yt-dlp` (Windows)
- Some sites may require cookies or authentication (see yt-dlp docs)

---

### No images extracted / very few images

**Problem:** The video might not have clear still frames, or settings are too strict.

**Solution:**
- Use `--verbose` to see what's happening: `harvest video.mp4 --verbose`
- Try more sensitive settings: `harvest video.mp4 --min-freeze 0.3 --noise -50`
- Check the video manually - does it actually have still frames?

---

### Too many duplicate images

**Problem:** Deduplication isn't strict enough.

**Solution:**
- Lower the hash distance threshold: `harvest video.mp4 --hash-distance 4`
- Default is 6, try values between 3-5 for stricter matching

---

### Need More Help?

- Check existing issues: https://github.com/EthanJStark/meme-harvester/issues
- Open a new issue with:
  - Your platform (macOS/Windows/Linux)
  - Command you ran
  - Error message (run with `--verbose` for more details)

## How It Works

Curious about what happens under the hood? Here's the pipeline:

1. **Download** (if using `--url`)
   - yt-dlp downloads the video to a temporary location

2. **Probe**
   - FFmpeg reads video metadata (duration, resolution, format)

3. **Detect Still Frames**
   - FFmpeg's `freezedetect` filter scans the video
   - Finds segments where the image doesn't change
   - Uses noise threshold and minimum duration to filter out false positives

4. **Extract Frames**
   - One frame extracted from the middle of each still segment
   - Saved as JPEG or PNG

5. **Perceptual Hashing**
   - Each frame gets a 64-bit pHash (perceptual hash)
   - Similar images produce similar hashes

6. **Deduplication**
   - Frames are compared using Hamming distance (bit differences)
   - Clusters of similar frames are identified
   - Only the "canonical" (representative) frame from each cluster is kept

7. **Output**
   - Unique images saved to `OUTPUT/<video-name>/<scan-number>/`
   - JSON report includes all metadata, timestamps, and deduplication info

**Technologies:**
- **FFmpeg** - Video processing and freeze detection
- **yt-dlp** - Video downloading from URLs
- **sharp** - Image processing
- **sharp-phash** - Perceptual hashing for deduplication

## For Developers

Want to contribute or build from source?

### Prerequisites
- Node.js 24+ (LTS)
- FFmpeg 4.0+ with freezedetect support
- yt-dlp (optional, for URL downloads)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/EthanJStark/meme-harvester.git
cd meme-harvester

# Install dependencies
npm install

# Run in development mode
npm run dev -- test.mp4 --verbose

# Example: Process from URL
npm run dev -- --url "https://www.youtube.com/watch?v=example" --verbose
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run lint
```

### Building

```bash
# Build TypeScript to dist/
npm run build

# Build platform bundles (requires native platform)
npm run build:bundles

# Build specific platform
npm run build:bundles -- --platform macos-arm64

# Clean build directory
npm run build:bundles:clean
```

**Note:** Building bundles requires running on the target platform to ensure Sharp native binaries are correct. Use GitHub Actions for cross-platform builds.

### Project Structure

```
src/
├── cli.ts                    # Commander CLI definition
├── lib/
│   ├── pipeline.ts          # Main orchestration (5-stage pipeline)
│   ├── types.ts             # TypeScript interfaces
│   ├── report.ts            # JSON report generation
│   ├── download/ytdlp.ts    # yt-dlp wrapper
│   ├── ffmpeg/              # FFmpeg subprocess wrappers
│   │   ├── probe.ts         # Video metadata extraction
│   │   ├── freezedetect.ts  # Still interval detection
│   │   └── extract.ts       # Frame extraction
│   └── hash/                # Perceptual hashing
│       ├── phash.ts         # Compute pHash
│       ├── hamming.ts       # Hamming distance
│       └── dedupe.ts        # Clustering algorithm
└── utils/
    ├── fs.ts                # Path utilities
    └── logger.ts            # Console logging
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test && npm run lint`
5. Commit changes: `git commit -m "Add my feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

## License

MIT
