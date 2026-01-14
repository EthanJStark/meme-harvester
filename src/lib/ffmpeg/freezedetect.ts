import { execa } from 'execa';
import type { FreezeInterval } from '../types.js';
import { logger } from '../../utils/logger.js';

export function parseFreezedetectOutput(stderr: string): FreezeInterval[] {
  const intervals: FreezeInterval[] = [];
  const lines = stderr.split('\n');

  const freezeStartRegex = /freeze_start:\s+([\d.]+)/;
  const freezeEndRegex = /freeze_end:\s+([\d.]+)/;

  let currentStart: number | null = null;
  let idCounter = 1;

  for (const line of lines) {
    const startMatch = line.match(freezeStartRegex);
    const endMatch = line.match(freezeEndRegex);

    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
    } else if (endMatch && currentStart !== null) {
      const endSec = parseFloat(endMatch[1]);
      intervals.push({
        id: `int_${String(idCounter).padStart(3, '0')}`,
        startSec: currentStart,
        endSec,
        durationSec: parseFloat((endSec - currentStart).toFixed(1))
      });
      currentStart = null;
      idCounter++;
    }
  }

  // Handle freeze that extends to EOF
  if (currentStart !== null) {
    intervals.push({
      id: `int_${String(idCounter).padStart(3, '0')}`,
      startSec: currentStart,
      endSec: null,
      durationSec: 0 // Will be calculated later based on video duration
    });
  }

  return intervals;
}

export async function detectFreezeIntervals(
  inputPath: string,
  minDuration: number,
  noiseThreshold: string
): Promise<FreezeInterval[]> {
  logger.verbose(`Running freezedetect on ${inputPath}`);
  logger.verbose(`  min-duration=${minDuration}s, noise=${noiseThreshold}`);

  const { stderr } = await execa('ffmpeg', [
    '-hide_banner',
    '-i', inputPath,
    '-vf', `freezedetect=n=${noiseThreshold}:d=${minDuration}`,
    '-map', '0:v:0',
    '-f', 'null',
    '-'
  ], {
    reject: false // Don't throw on non-zero exit (ffmpeg outputs to null)
  });

  logger.verbose('FFmpeg stderr:', stderr);

  return parseFreezedetectOutput(stderr);
}
