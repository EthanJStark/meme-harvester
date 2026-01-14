import { execa } from 'execa';
import { logger } from '../../utils/logger.js';

export function calculateTimestamp(
  startSec: number,
  endSec: number | null,
  videoDurationSec: number
): number {
  if (endSec !== null) {
    // Normal interval: use midpoint
    return (startSec + endSec) / 2;
  } else {
    // EOF interval: bounded offset
    const offset = Math.max(0.1, Math.min(1.0, (videoDurationSec - startSec) / 2));
    return Math.min(startSec + offset, videoDurationSec);
  }
}

export async function extractFrame(
  inputPath: string,
  timestampSec: number,
  outputPath: string,
  format: 'jpg' | 'png'
): Promise<void> {
  logger.verbose(`Extracting frame at ${timestampSec}s -> ${outputPath}`);

  const args = [
    '-hide_banner',
    '-ss', String(timestampSec),
    '-i', inputPath,
    '-frames:v', '1'
  ];

  // Add quality options for JPEG
  if (format === 'jpg') {
    args.push('-q:v', '2');
  }

  args.push(outputPath);

  await execa('ffmpeg', args);

  logger.verbose(`Extracted frame: ${outputPath}`);
}
