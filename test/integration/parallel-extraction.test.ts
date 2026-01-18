import { describe, test, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { processVideo } from '../../src/lib/pipeline.js';
import type { Config } from '../../src/lib/types.js';
import { execSync } from 'child_process';

describe('Parallel Frame Extraction', () => {
  test('should extract frames in parallel batches', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'meme-harvester-parallel-'));

    try {
      // Generate video with 10 freeze intervals (10s each = 100s total)
      const fixtureVideo = join(testDir, 'many-freezes.mp4');
      const colors = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'white', 'black', 'orange', 'purple'];
      const inputs = colors.map(
        (c, i) => `-f lavfi -i color=c=${c}:s=320x240:d=10`
      ).join(' ');
      execSync(
        `ffmpeg ${inputs} ` +
        `-filter_complex "[0][1][2][3][4][5][6][7][8][9]concat=n=10:v=1:a=0" ` +
        `-y ${fixtureVideo}`,
        { stdio: 'ignore' }
      );

      const config: Config = {
        inputs: [fixtureVideo],
        output: testDir,
        minFreeze: 2.0,
        noise: '-60dB',
        format: 'jpg',
        hash: 'phash',
        hashDistance: 6,
        keepDuplicates: false,
        json: 'report.json',
        verbose: false,
        classify: false,
        concurrency: 2,
        channelTimeout: 60000
      };

      const startTime = Date.now();
      const result = await processVideo(fixtureVideo, config);
      const duration = Date.now() - startTime;

      // Verify all frames extracted
      expect(result.frames.length).toBe(10);
      expect(result.intervals.length).toBe(10);

      // Verify frames are properly ordered by timestamp
      for (let i = 1; i < result.frames.length; i++) {
        expect(result.frames[i].timestampSec).toBeGreaterThan(
          result.frames[i - 1].timestampSec
        );
      }

      // Performance expectation: should complete in reasonable time
      // With parallelization, 10 frames should extract in < 30 seconds
      // (Sequential might take 50-100 seconds)
      expect(duration).toBeLessThan(30000);

      console.log(`Extracted ${result.frames.length} frames in ${duration}ms`);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  }, 60000); // 60s timeout for long test
});
