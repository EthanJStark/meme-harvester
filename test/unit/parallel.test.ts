import { describe, it, expect, vi } from 'vitest';
import { processChannelVideos } from '../../src/lib/parallel.js';
import type { ChannelInfo, Config } from '../../src/lib/types.js';

// Mock dependencies
vi.mock('../../src/lib/download/ytdlp.js', () => ({
  validateYtDlp: vi.fn().mockResolvedValue(undefined),
  downloadUrl: vi.fn().mockResolvedValue('/tmp/video.mp4')
}));

vi.mock('../../src/lib/pipeline.js', () => ({
  processVideo: vi.fn().mockResolvedValue({
    path: '/output/channel/video',
    sourceUrl: 'https://youtube.com/watch?v=abc',
    probe: { durationSec: 60, width: 1920, height: 1080, codec: 'h264', fps: 30 },
    frames: [],
    dedupe: {
      totalFrames: 0,
      uniqueFrames: 0,
      clusters: [],
      hammingDistanceThreshold: 5
    }
  })
}));

describe('Parallel Processing', () => {
  const mockConfig: Config = {
    inputs: undefined,
    channelUrl: 'https://youtube.com/@test',
    concurrency: 2,
    output: '/tmp/output',
    minFreeze: 0.5,
    noise: '-60dB',
    format: 'jpg',
    hash: 'phash',
    hashDistance: 5,
    keepDuplicates: false,
    json: 'report.json',
    verbose: false
  };

  it('should process videos in batches based on concurrency', async () => {
    const channelInfo: ChannelInfo = {
      channelName: 'TestChannel',
      channelUrl: 'https://youtube.com/@test',
      videos: [
        { url: 'https://youtube.com/watch?v=1', title: 'Video 1' },
        { url: 'https://youtube.com/watch?v=2', title: 'Video 2' },
        { url: 'https://youtube.com/watch?v=3', title: 'Video 3' }
      ]
    };

    const result = await processChannelVideos(channelInfo, mockConfig);

    expect(result.results).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle errors without stopping other videos', async () => {
    const { processVideo } = await import('../../src/lib/pipeline.js');

    // Mock one video to fail
    vi.mocked(processVideo).mockRejectedValueOnce(new Error('Download failed'));

    const channelInfo: ChannelInfo = {
      channelName: 'TestChannel',
      channelUrl: 'https://youtube.com/@test',
      videos: [
        { url: 'https://youtube.com/watch?v=1', title: 'Video 1' },
        { url: 'https://youtube.com/watch?v=2', title: 'Video 2' }
      ]
    };

    const result = await processChannelVideos(channelInfo, mockConfig);

    expect(result.results).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('Download failed');
  });

  it('should respect concurrency limit', async () => {
    const channelInfo: ChannelInfo = {
      channelName: 'TestChannel',
      channelUrl: 'https://youtube.com/@test',
      videos: [
        { url: 'https://youtube.com/watch?v=1', title: 'Video 1' },
        { url: 'https://youtube.com/watch?v=2', title: 'Video 2' },
        { url: 'https://youtube.com/watch?v=3', title: 'Video 3' },
        { url: 'https://youtube.com/watch?v=4', title: 'Video 4' }
      ]
    };

    const configWith2Concurrency = { ...mockConfig, concurrency: 2 };
    const result = await processChannelVideos(channelInfo, configWith2Concurrency);

    // Should process all 4 videos successfully (2 batches of 2)
    expect(result.results).toHaveLength(4);
  });
});
