import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { generateFixtureVideo } from '../fixtures/generate-fixture.js';
import { probeVideo } from '../../src/lib/ffmpeg/probe.js';
import { detectFreezeIntervals } from '../../src/lib/ffmpeg/freezedetect.js';
import { extractFrame, calculateTimestamp } from '../../src/lib/ffmpeg/extract.js';
import { computeHash } from '../../src/lib/hash/phash.js';
import { deduplicateFrames } from '../../src/lib/hash/dedupe.js';
import { ensureOutputDir, getStillPath, ensureStillsDir } from '../../src/utils/fs.js';
import type { Frame } from '../../src/lib/types.js';

const FIXTURE_PATH = '/tmp/meme-harvester-fixture.mp4';
const OUTPUT_DIR = '/tmp/meme-harvester-integration-test';

describe('Meme Harvester Integration', () => {
  beforeAll(async () => {
    await generateFixtureVideo(FIXTURE_PATH);
  }, 60000); // 60s timeout for video generation

  afterAll(async () => {
    await rm(FIXTURE_PATH, { force: true });
    await rm(OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should detect freeze intervals in fixture video', async () => {
    const intervals = await detectFreezeIntervals(FIXTURE_PATH, 2, '-60dB');
    expect(intervals.length).toBeGreaterThan(0);
  }, 30000);

  it('should extract and hash frames', async () => {
    const probe = await probeVideo(FIXTURE_PATH);
    const intervals = await detectFreezeIntervals(FIXTURE_PATH, 2, '-60dB');

    await ensureOutputDir(OUTPUT_DIR);
    await ensureStillsDir(OUTPUT_DIR, FIXTURE_PATH);

    const frames: Frame[] = [];

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const timestamp = calculateTimestamp(interval.startSec, interval.endSec, probe.durationSec);
      const outputPath = getStillPath(OUTPUT_DIR, FIXTURE_PATH, i + 1, 'jpg');

      await extractFrame(FIXTURE_PATH, timestamp, outputPath, 'jpg');
      expect(existsSync(outputPath)).toBe(true);

      const hashResult = await computeHash(outputPath);

      frames.push({
        id: `frm_${String(i + 1).padStart(3, '0')}`,
        intervalId: interval.id,
        timestampSec: timestamp,
        file: outputPath,
        hash: hashResult.hash,
        hashAlgo: hashResult.hashAlgo,
        hashBits: hashResult.hashBits,
        isCanonical: false
      });
    }

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].hash).toBeTruthy();
  }, 60000);

  it('should deduplicate similar frames', async () => {
    // Use simple test frames with known hashes
    const frames: Frame[] = [
      { id: 'frm_001', intervalId: 'int_001', timestampSec: 10, file: 'a.jpg', hash: '0000000000000000', hashAlgo: 'phash', hashBits: 64, isCanonical: false },
      { id: 'frm_002', intervalId: 'int_002', timestampSec: 20, file: 'b.jpg', hash: '0000000000000000', hashAlgo: 'phash', hashBits: 64, isCanonical: false },
      { id: 'frm_003', intervalId: 'int_003', timestampSec: 30, file: 'c.jpg', hash: 'ffffffffffffffff', hashAlgo: 'phash', hashBits: 64, isCanonical: false }
    ];

    const clusters = deduplicateFrames(frames, 6);

    expect(clusters.length).toBe(2); // Two distinct clusters
    expect(clusters[0].members.length).toBe(2); // First two frames clustered
    expect(frames[0].isCanonical).toBe(true);
    expect(frames[1].isCanonical).toBe(false);
  });
});
