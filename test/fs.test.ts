import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { getNextScanNumber, getStillsDir, getStillPath, ensureStillsDir } from '../src/utils/fs.js';

describe('gitignore configuration', () => {
  it('should include OUTPUT/ directory', () => {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('OUTPUT/');
  });
});

describe('getNextScanNumber', () => {
  const testOutputDir = join(process.cwd(), 'test-output');
  const videoName = 'test-video';

  beforeEach(async () => {
    await mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testOutputDir, { recursive: true, force: true });
  });

  it('should return 1 when no scans exist', async () => {
    const scanNumber = await getNextScanNumber(testOutputDir, videoName);
    expect(scanNumber).toBe(1);
  });

  it('should return 2 when scan 1 exists', async () => {
    await mkdir(join(testOutputDir, videoName, '1'), { recursive: true });
    const scanNumber = await getNextScanNumber(testOutputDir, videoName);
    expect(scanNumber).toBe(2);
  });

  it('should return 4 when scans 1, 2, 3 exist', async () => {
    await mkdir(join(testOutputDir, videoName, '1'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, '2'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, '3'), { recursive: true });
    const scanNumber = await getNextScanNumber(testOutputDir, videoName);
    expect(scanNumber).toBe(4);
  });

  it('should handle non-sequential scan numbers', async () => {
    await mkdir(join(testOutputDir, videoName, '1'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, '5'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, '3'), { recursive: true });
    const scanNumber = await getNextScanNumber(testOutputDir, videoName);
    expect(scanNumber).toBe(6);
  });

  it('should ignore non-numeric directories', async () => {
    await mkdir(join(testOutputDir, videoName, '1'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, 'foo'), { recursive: true });
    await mkdir(join(testOutputDir, videoName, '2'), { recursive: true });
    const scanNumber = await getNextScanNumber(testOutputDir, videoName);
    expect(scanNumber).toBe(3);
  });
});

describe('getStillsDir', () => {
  it('should return OUTPUT/<video-name>/<scan-number>/', () => {
    const dir = getStillsDir('OUTPUT', 'test.mp4', 1);
    expect(dir).toBe(join('OUTPUT', 'test', '1'));
  });

  it('should strip video extension', () => {
    const dir = getStillsDir('OUTPUT', 'my-video.mp4', 2);
    expect(dir).toBe(join('OUTPUT', 'my-video', '2'));
  });

  it('should handle video names with multiple dots', () => {
    const dir = getStillsDir('OUTPUT', 'video.test.mp4', 3);
    expect(dir).toBe(join('OUTPUT', 'video.test', '3'));
  });
});

describe('getStillPath', () => {
  it('should return correct path with jpg format', () => {
    const path = getStillPath('OUTPUT', 'test.mp4', 1, 1, 'jpg');
    expect(path).toBe(join('OUTPUT', 'test', '1', 'still_0001.jpg'));
  });

  it('should return correct path with png format', () => {
    const path = getStillPath('OUTPUT', 'test.mp4', 2, 5, 'png');
    expect(path).toBe(join('OUTPUT', 'test', '2', 'still_0005.png'));
  });

  it('should pad frame index with zeros', () => {
    const path = getStillPath('OUTPUT', 'video.mp4', 1, 123, 'jpg');
    expect(path).toBe(join('OUTPUT', 'video', '1', 'still_0123.jpg'));
  });
});

describe('ensureStillsDir', () => {
  const testOutputDir = join(process.cwd(), 'test-output-dirs');

  afterEach(async () => {
    await rm(testOutputDir, { recursive: true, force: true });
  });

  it('should create output directory structure', async () => {
    await ensureStillsDir(testOutputDir, 'test.mp4', 1);
    const expectedPath = join(testOutputDir, 'test', '1');
    expect(existsSync(expectedPath)).toBe(true);
  });
});
