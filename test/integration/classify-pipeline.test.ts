import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { processVideo } from '../../src/lib/pipeline.js';
import type { Config } from '../../src/lib/types.js';
import { execSync } from 'child_process';

describe('Classification Pipeline Integration', () => {
  let testDir: string;
  let fixtureVideo: string;
  let mockModelPath: string;
  let mockScriptPath: string;

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'meme-harvester-classify-'));

    // Generate test video (30s with 3 freeze intervals)
    fixtureVideo = join(testDir, 'fixture.mp4');
    execSync(
      `ffmpeg -f lavfi -i color=c=red:s=320x240:d=10 ` +
      `-f lavfi -i color=c=green:s=320x240:d=10 ` +
      `-f lavfi -i color=c=blue:s=320x240:d=10 ` +
      `-filter_complex "[0][1][2]concat=n=3:v=1:a=0" ` +
      `-y ${fixtureVideo}`,
      { stdio: 'ignore' }
    );

    // Create mock Python classifier
    await mkdir(join(process.cwd(), 'models'), { recursive: true });
    await mkdir(join(process.cwd(), 'python'), { recursive: true });

    // Mock classifier model (empty pickle)
    mockModelPath = join(process.cwd(), 'models/classifier.pkl');
    await writeFile(mockModelPath, Buffer.from([
      0x80, 0x04, 0x95, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x7D, 0x94, 0x2E // Minimal valid pickle: {}
    ]));

    // Mock classification script
    mockScriptPath = join(process.cwd(), 'python/classify_images.py');
    await writeFile(
      mockScriptPath,
      `#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path

# Mock classification: alternate between keep/exclude
image_dir = sys.argv[1]
images = sorted(Path(image_dir).glob('**/*.jpg'))
results = []

for i, img_path in enumerate(images):
    label = 'keep' if i % 2 == 0 else 'exclude'
    confidence = 0.85 + (i * 0.01)  # Varying confidence
    results.append({
        'path': str(img_path),
        'label': label,
        'confidence': confidence
    })

print(json.dumps(results))
`
    );
    execSync(`chmod +x ${mockScriptPath}`);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
    await rm(mockModelPath, { force: true });
    await rm(mockScriptPath, { force: true });
  });

  test('should classify frames and include results in report', async () => {
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
      classify: true, // Enable classification
      concurrency: 2,
      channelTimeout: 60000
    };

    const result = await processVideo(fixtureVideo, config);

    // Verify frames were classified
    expect(result.frames.length).toBeGreaterThan(0);

    for (const frame of result.frames) {
      expect(frame.classification).toBeDefined();
      expect(frame.classification).not.toBeNull();
      expect(frame.classification?.label).toMatch(/^(keep|exclude)$/);
      expect(frame.classification?.confidence).toBeGreaterThan(0);
      expect(frame.classification?.confidence).toBeLessThanOrEqual(1);
    }

    // Verify classification distribution
    const keepCount = result.frames.filter(
      f => f.classification?.label === 'keep'
    ).length;
    const excludeCount = result.frames.filter(
      f => f.classification?.label === 'exclude'
    ).length;

    expect(keepCount).toBeGreaterThan(0);
    expect(excludeCount).toBeGreaterThan(0);
  });

  test('should handle missing model gracefully', async () => {
    // Remove model temporarily
    await rm(mockModelPath, { force: true });

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
      classify: true,
      concurrency: 2,
      channelTimeout: 60000
    };

    // Should not throw error
    const result = await processVideo(fixtureVideo, config);

    // Frames should have null classification
    for (const frame of result.frames) {
      expect(frame.classification).toBeNull();
    }

    // Restore model for cleanup
    await writeFile(mockModelPath, Buffer.from([
      0x80, 0x04, 0x95, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x7D, 0x94, 0x2E
    ]));
  });
});
