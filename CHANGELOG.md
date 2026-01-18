# Changelog

All notable changes to meme-harvester will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-17

### Added
- Integration tests for ML classification pipeline (`test/integration/classify-pipeline.test.ts`)
- Integration tests for parallel frame extraction performance (`test/integration/parallel-extraction.test.ts`)
- Security tests for path traversal protection (`test/unit/fs-security.test.ts`)
- `validateOutputPath()` utility for path validation
- `parseFraction()` utility for safe frame rate parsing

### Changed
- Frame extraction now processes intervals in parallel batches (1.7x+ speedup)
- Extraction batch size: 5 frames per batch
- Test suite expanded from 134 to 135+ tests

### Fixed
- **SECURITY:** Replaced `eval()` with safe fraction parser in `probe.ts` (code injection vulnerability)
- **SECURITY:** Added path traversal protection to prevent writes outside project directory
- Improved error messages for invalid output paths

### Performance
- Frame extraction speed improved 1.7x+ for videos with many freeze intervals
- Maintains correct frame ordering and deduplication with parallel extraction

## [1.0.0] - 2026-01-15

Initial release with:
- FFmpeg-based freeze detection
- Perceptual hashing and deduplication
- YouTube channel support
- Optional ML classification
- 134 passing tests
