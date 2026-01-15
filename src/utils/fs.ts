import { mkdir, readdir } from 'fs/promises';
import { basename, extname, join } from 'path';
import { existsSync } from 'fs';

export async function getNextScanNumber(
  outputDir: string,
  videoName: string
): Promise<number> {
  const videoDir = join(outputDir, videoName);

  if (!existsSync(videoDir)) {
    return 1;
  }

  try {
    const entries = await readdir(videoDir, { withFileTypes: true });
    const scanNumbers = entries
      .filter(entry => entry.isDirectory())
      .map(entry => parseInt(entry.name, 10))
      .filter(num => !isNaN(num) && num > 0);

    if (scanNumbers.length === 0) {
      return 1;
    }

    return Math.max(...scanNumbers) + 1;
  } catch (error) {
    // Directory doesn't exist or can't be read
    return 1;
  }
}

export async function ensureOutputDir(outputDir: string): Promise<void> {
  await mkdir(join(outputDir, 'stills'), { recursive: true });
}

export function getStillsDir(outputDir: string, videoPath: string): string {
  const videoName = basename(videoPath, extname(videoPath));
  return join(outputDir, 'stills', videoName);
}

export function getStillPath(
  outputDir: string,
  videoPath: string,
  index: number,
  format: 'jpg' | 'png'
): string {
  const stillsDir = getStillsDir(outputDir, videoPath);
  const filename = `still_${String(index).padStart(4, '0')}.${format}`;
  return join(stillsDir, filename);
}

export async function ensureStillsDir(outputDir: string, videoPath: string): Promise<void> {
  const stillsDir = getStillsDir(outputDir, videoPath);
  await mkdir(stillsDir, { recursive: true });
}
