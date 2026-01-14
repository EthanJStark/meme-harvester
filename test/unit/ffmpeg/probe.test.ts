import { describe, it, expect, vi } from 'vitest';
import { probeVideo } from '../../../src/lib/ffmpeg/probe.js';
import { execa } from 'execa';

vi.mock('execa');

describe('FFprobe', () => {
  it('should parse duration from ffprobe output', async () => {
    const mockOutput = JSON.stringify({
      format: {
        duration: '120.50'
      },
      streams: [
        { codec_type: 'video', index: 0 }
      ]
    });

    vi.mocked(execa).mockResolvedValueOnce({
      stdout: mockOutput,
      stderr: '',
      exitCode: 0
    } as any);

    const result = await probeVideo('test.mp4');
    expect(result.durationSec).toBe(120.5);
    expect(result.videoStream).toBe('0:v:0');
  });

  it('should throw if no video stream found', async () => {
    const mockOutput = JSON.stringify({
      format: { duration: '120.50' },
      streams: [
        { codec_type: 'audio', index: 0 }
      ]
    });

    vi.mocked(execa).mockResolvedValueOnce({
      stdout: mockOutput,
      stderr: '',
      exitCode: 0
    } as any);

    await expect(probeVideo('test.mp4')).rejects.toThrow('No video stream found');
  });
});
