import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { getNextScanNumber } from '../src/utils/fs.js';

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
