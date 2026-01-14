import { execa } from 'execa';
import { logger } from '../../utils/logger.js';

export interface ProbeResult {
  durationSec: number;
  videoStream: string; // e.g., "0:v:0"
  width: number;
  height: number;
  fps: number;
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
  const fps = eval(videoStream.r_frame_rate); // e.g., "30/1" -> 30

  return {
    durationSec: duration,
    videoStream: `${videoStream.index}:v:0`,
    width: videoStream.width,
    height: videoStream.height,
    fps
  };
}
