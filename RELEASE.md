# Release Process

This document describes how to create a new release of Meme Harvester.

## Prerequisites

- Write access to GitHub repository
- Clean working directory (no uncommitted changes)
- All tests passing: `npm test`
- Build successful: `npm run build`

## Release Steps

### 1. Update Version

Update version in `package.json`:

```bash
npm version [major|minor|patch]
# Example: npm version patch
# This creates a commit and git tag automatically
```

Or manually:
1. Edit version in `package.json`
2. Commit: `git commit -am "chore: bump version to X.Y.Z"`
3. Tag: `git tag vX.Y.Z`

### 2. Push Tag

```bash
git push origin main --tags
```

This triggers the GitHub Actions workflow that:
- Builds bundles on native runners for each platform
- Creates compressed archives
- Generates SHA256 checksums
- Publishes GitHub release with all artifacts

### 3. Monitor Build

1. Go to [Actions tab](https://github.com/EthanJStark/meme-harvester/actions)
2. Watch "Release Bundles" workflow
3. Verify all 4 platform builds complete successfully
4. Verify release job consolidates artifacts

### 4. Verify Release

1. Go to [Releases](https://github.com/EthanJStark/meme-harvester/releases)
2. Verify new release created with tag
3. Verify all 4 platform archives attached:
   - `harvest-macos-arm64.tar.gz`
   - `harvest-macos-x64.tar.gz`
   - `harvest-linux-x64.tar.gz`
   - `harvest-win-x64.zip`
4. Verify `checksums.txt` attached
5. Edit release notes if needed

### 5. Test Release Artifacts

Download and test at least one bundle:

```bash
# Download
curl -LO https://github.com/EthanJStark/meme-harvester/releases/download/vX.Y.Z/harvest-macos-arm64.tar.gz

# Verify checksum
curl -LO https://github.com/EthanJStark/meme-harvester/releases/download/vX.Y.Z/checksums.txt
sha256sum -c checksums.txt --ignore-missing

# Extract and test
tar -xzf harvest-macos-arm64.tar.gz
cd harvest-macos-arm64/
./harvest --version
./harvest --help
# Test with sample video if available
```

### 6. Announce Release

If public:
- Update README with latest version
- Post announcement (Twitter, Discord, etc.)
- Update package manager distributions (Homebrew, Chocolatey) if applicable

## Troubleshooting

### Build Fails on One Platform

1. Check GitHub Actions logs for specific platform
2. Common issues:
   - Sharp native binary compatibility
   - Node version mismatch
   - Missing dependencies

### Release Missing Artifacts

1. Check if workflow completed successfully
2. Verify all matrix jobs finished
3. Check artifact upload/download steps in logs
4. Re-run failed jobs if needed

### Checksums Don't Match

1. Re-download artifact (may be corrupted)
2. Verify download complete (check file size)
3. If persistent, delete release and re-run workflow

## Node Version Updates

When updating Node version:

1. Update `NODE_VERSION` in `scripts/build-bundles.js`
2. Update `node-version` in `.github/workflows/release.yml`
3. Add comment with update date
4. Test locally before releasing:
   ```bash
   npm run build:bundles:clean
   npm run build:bundles
   ```
5. Mention Node version update in release notes

## Emergency Rollback

If critical issue discovered after release:

1. Mark release as "Pre-release" in GitHub
2. Add warning to release notes
3. Create hotfix branch
4. Fix issue and create new patch release
5. Test thoroughly before removing pre-release flag
