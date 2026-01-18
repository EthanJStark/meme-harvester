import { describe, it, expect, vi } from 'vitest';
import { probeVideo, parseFraction } from '../../../src/lib/ffmpeg/probe.js';
import { execa } from 'execa';

vi.mock('execa');

describe('FFprobe', () => {
  it('should parse duration from ffprobe output', async () => {
    const mockOutput = JSON.stringify({
      format: {
        duration: '120.50'
      },
      streams: [
        { codec_type: 'video', index: 0, r_frame_rate: '30/1', width: 1920, height: 1080 }
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

describe('parseFraction', () => {
  it('should parse simple fraction', () => {
    expect(parseFraction('30/1')).toBe(30);
  });

  it('should parse decimal fraction', () => {
    expect(parseFraction('24000/1001')).toBeCloseTo(23.976, 3);
  });

  it('should handle whole number', () => {
    expect(parseFraction('60')).toBe(60);
  });

  it('should handle invalid input gracefully', () => {
    expect(() => parseFraction('invalid')).toThrow('Invalid frame rate format');
  });
});
