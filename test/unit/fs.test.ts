import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { ensureOutputDir, getStillsDir, getStillPath } from '../../src/utils/fs.js';
import { existsSync } from 'fs';

const TEST_DIR = '/tmp/media-scan-test';

describe('File System Utilities', () => {
  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should create output directory structure', async () => {
    await ensureOutputDir(TEST_DIR);
    expect(existsSync(TEST_DIR)).toBe(true);
    expect(existsSync(`${TEST_DIR}/stills`)).toBe(true);
  });

  it('should get stills directory for video', () => {
    const dir = getStillsDir(TEST_DIR, '/path/to/video.mp4');
    expect(dir).toBe(`${TEST_DIR}/stills/video`);
  });

  it('should generate still path with number', () => {
    const path = getStillPath(TEST_DIR, '/path/to/video.mp4', 1, 'jpg');
    expect(path).toBe(`${TEST_DIR}/stills/video/still_0001.jpg`);
  });
});
