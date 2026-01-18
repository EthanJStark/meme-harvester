import { execa } from 'execa';
import { logger } from '../../utils/logger.js';

export interface ProbeResult {
  durationSec: number;
  videoStream: string; // e.g., "0:v:0"
  width: number;
  height: number;
  fps: number;
}

/**
 * Parse FFmpeg frame rate fraction (e.g., "30/1" → 30, "24000/1001" → 23.976)
 * Safe alternative to eval()
 */
export function parseFraction(fraction: string): number {
  const parts = fraction.split('/');

  if (parts.length === 1) {
    // Whole number
    const num = parseFloat(parts[0]);
    if (isNaN(num)) {
      throw new Error(`Invalid frame rate format: ${fraction}`);
    }
    return num;
  }

  if (parts.length === 2) {
    // Fraction
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);

    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      throw new Error(`Invalid frame rate format: ${fraction}`);
    }

    return numerator / denominator;
  }

  throw new Error(`Invalid frame rate format: ${fraction}`);
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  logger.verbose(`Probing video: ${inputPath}`);

  const { stdout } = await execa('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputPath
  ]);

  const data = JSON.parse(stdout);

  // Find first video stream
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error(`No video stream found in ${inputPath}`);
  }

  const duration = parseFloat(data.format.duration);
  const fps = parseFraction(videoStream.r_frame_rate);

  return {
    durationSec: duration,
    videoStream: `${videoStream.index}:v:0`,
    width: videoStream.width,
    height: videoStream.height,
    fps
  };
}
