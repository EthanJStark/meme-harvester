// test/build-bundles.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('build-bundles', () => {
  const testBuildDir = path.join(projectRoot, 'test-build');

  beforeEach(async () => {
    await fs.rm(testBuildDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testBuildDir, { recursive: true, force: true });
  });

  it('should create required build directory structure', async () => {
    const { setupDirectories } = await import('../scripts/build-bundles.js');

    const dirs = await setupDirectories(testBuildDir);

    expect(dirs.root).toBe(testBuildDir);
    expect(dirs.downloads).toBe(path.join(testBuildDir, 'downloads'));
    expect(dirs.tempDeps).toBe(path.join(testBuildDir, 'temp-deps'));
    expect(dirs.bundles).toBe(path.join(testBuildDir, 'bundles'));

    // Verify directories exist
    await expect(fs.access(dirs.downloads)).resolves.toBeUndefined();
    await expect(fs.access(dirs.tempDeps)).resolves.toBeUndefined();
    await expect(fs.access(dirs.bundles)).resolves.toBeUndefined();
  });

  it('should download Node binary with caching', async () => {
    const { downloadNodeBinary, PLATFORMS } = await import('../scripts/build-bundles.js');

    const downloadsDir = path.join(testBuildDir, 'downloads');
    await fs.mkdir(downloadsDir, { recursive: true });

    const platform = 'macos-arm64';
    const config = PLATFORMS[platform];

    // First download
    const binaryPath1 = await downloadNodeBinary(platform, config, downloadsDir);
    expect(binaryPath1).toBe(path.join(downloadsDir, 'node-macos-arm64'));

    const stats1 = await fs.stat(binaryPath1);
    expect(stats1.isFile()).toBe(true);

    // Second download should use cache (check modification time unchanged)
    const binaryPath2 = await downloadNodeBinary(platform, config, downloadsDir);
    const stats2 = await fs.stat(binaryPath2);

    expect(binaryPath2).toBe(binaryPath1);
    expect(stats2.mtime.getTime()).toBe(stats1.mtime.getTime());
  }, 30000); // 30 second timeout for download

  it('should run when executed directly (entry point detection)', async () => {
    // This test verifies the entry point detection works cross-platform
    // The script should produce output when run directly
    const { execa } = await import('execa');
    const scriptPath = path.join(projectRoot, 'scripts', 'build-bundles.js');

    // Run the script with a 3 second timeout - just need to verify it starts
    const result = await execa('node', [scriptPath], {
      reject: false, // Don't throw on non-zero exit
      cwd: projectRoot,
      timeout: 3000,
      killSignal: 'SIGTERM',
    });

    // Should produce the initial startup message OR an error about missing dist/
    // Either proves the entry point detection worked
    expect(result.stdout + result.stderr).toMatch(/Starting bundle build process|dist.*not found/);
  }, 10000); // 10 second test timeout
});
