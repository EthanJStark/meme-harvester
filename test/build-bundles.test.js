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
});
