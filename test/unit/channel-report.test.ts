import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeChannelReport } from '../../src/lib/channel-report.js';
import type { ChannelResult, Config } from '../../src/lib/types.js';
import { readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_OUTPUT = '/tmp/meme-harvester-test-channel-report';

describe('Channel Report', () => {
  beforeEach(async () => {
    await mkdir(TEST_OUTPUT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_OUTPUT, { recursive: true, force: true });
  });

  it('should write per-video reports', async () => {
    const channelResult: ChannelResult = {
      channelInfo: {
        channelName: 'TestChannel',
        channelUrl: 'https://youtube.com/@test',
        videos: [
          { url: 'https://youtube.com/watch?v=abc', title: 'Video 1' }
        ]
      },
      results: [
        {
          path: join(TEST_OUTPUT, 'TestChannel', 'Video_1'),
          sourceUrl: 'https://youtube.com/watch?v=abc',
          probe: {
            durationSec: 60,
            width: 1920,
            height: 1080,
            codec: 'h264',
            fps: 30
          },
          frames: [
            {
              index: 1,
              timestampSec: 10.5,
              hash: 'abc123',
              path: join(TEST_OUTPUT, 'TestChannel', 'Video_1', 'still_0001.jpg'),
              cluster: 0,
              isCanonical: true
            }
          ],
          dedupe: {
            totalFrames: 1,
            uniqueFrames: 1,
            clusters: [
              {
                canonicalIndex: 0,
                memberIndices: [0],
                representativeHash: 'abc123'
              }
            ],
            hammingDistanceThreshold: 5
          }
        }
      ],
      errors: []
    };

    const config: Config = {
      inputs: undefined,
      channelUrl: 'https://youtube.com/@test',
      concurrency: 2,
      output: TEST_OUTPUT,
      minFreeze: 0.5,
      noise: '-60dB',
      format: 'jpg',
      hash: 'phash',
      hashDistance: 5,
      keepDuplicates: false,
      json: 'report.json',
      verbose: false
    };

    await writeChannelReport(channelResult, config);

    // Verify per-video report exists
    const videoReportPath = join(TEST_OUTPUT, 'TestChannel', 'Video_1', 'report.json');
    const videoReport = JSON.parse(await readFile(videoReportPath, 'utf-8'));
    expect(videoReport.version).toBe('1.0');
    expect(videoReport.inputs).toHaveLength(1);
  });

  it('should write aggregate channel report', async () => {
    const channelResult: ChannelResult = {
      channelInfo: {
        channelName: 'TestChannel',
        channelUrl: 'https://youtube.com/@test',
        videos: [
          { url: 'https://youtube.com/watch?v=abc', title: 'Video 1' },
          { url: 'https://youtube.com/watch?v=def', title: 'Video 2' }
        ]
      },
      results: [
        {
          path: join(TEST_OUTPUT, 'TestChannel', 'Video_1'),
          sourceUrl: 'https://youtube.com/watch?v=abc',
          probe: { durationSec: 60, width: 1920, height: 1080, codec: 'h264', fps: 30 },
          frames: [],
          dedupe: {
            totalFrames: 0,
            uniqueFrames: 0,
            clusters: [],
            hammingDistanceThreshold: 5
          }
        }
      ],
      errors: [
        {
          url: 'https://youtube.com/watch?v=def',
          title: 'Video 2',
          error: 'Download failed'
        }
      ]
    };

    const config: Config = {
      inputs: undefined,
      channelUrl: 'https://youtube.com/@test',
      concurrency: 2,
      output: TEST_OUTPUT,
      minFreeze: 0.5,
      noise: '-60dB',
      format: 'jpg',
      hash: 'phash',
      hashDistance: 5,
      keepDuplicates: false,
      json: 'report.json',
      verbose: false
    };

    await writeChannelReport(channelResult, config);

    // Verify channel report exists
    const channelReportPath = join(TEST_OUTPUT, 'TestChannel', 'channel-report.json');
    const channelReport = JSON.parse(await readFile(channelReportPath, 'utf-8'));

    expect(channelReport.version).toBe('1.0');
    expect(channelReport.channelName).toBe('TestChannel');
    expect(channelReport.summary.totalVideos).toBe(2);
    expect(channelReport.summary.successCount).toBe(1);
    expect(channelReport.summary.errorCount).toBe(1);
    expect(channelReport.videos).toHaveLength(1);
    expect(channelReport.errors).toHaveLength(1);
  });
});
