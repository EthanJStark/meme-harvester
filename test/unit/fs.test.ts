import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { ensureOutputDir, getStillsDir, getStillPath } from '../../src/utils/fs.js';
import { existsSync } from 'fs';

const TEST_DIR = '/tmp/meme-harvester-test';

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
  });

  it('should get stills directory for video with scan number', () => {
    const dir = getStillsDir(TEST_DIR, '/path/to/video.mp4', 1);
    expect(dir).toBe(`${TEST_DIR}/video/1`);
  });

  it('should generate still path with scan number', () => {
    const path = getStillPath(TEST_DIR, '/path/to/video.mp4', 1, 1, 'jpg');
    expect(path).toBe(`${TEST_DIR}/video/1/still_0001.jpg`);
  });
});
