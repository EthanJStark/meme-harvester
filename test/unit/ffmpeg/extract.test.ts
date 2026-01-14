import { describe, it, expect, vi } from 'vitest';
import { extractFrame, calculateTimestamp } from '../../../src/lib/ffmpeg/extract.js';
import { execa } from 'execa';

vi.mock('execa');

describe('Frame Extraction', () => {
  it('should calculate midpoint timestamp for normal interval', () => {
    const timestamp = calculateTimestamp(10.0, 20.0, 100.0);
    expect(timestamp).toBe(15.0);
  });

  it('should calculate bounded timestamp for EOF interval', () => {
    const timestamp = calculateTimestamp(95.0, null, 100.0);
    expect(timestamp).toBeGreaterThan(95.0);
    expect(timestamp).toBeLessThanOrEqual(100.0);
  });

  it('should call ffmpeg with correct arguments', async () => {
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 0
    } as any);

    await extractFrame('input.mp4', 15.5, '/tmp/output.jpg', 'jpg');

    expect(execa).toHaveBeenCalledWith('ffmpeg', [
      '-hide_banner',
      '-ss', '15.5',
      '-i', 'input.mp4',
      '-frames:v', '1',
      '-q:v', '2',
      '/tmp/output.jpg'
    ]);
  });
});
