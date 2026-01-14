import { mkdir } from 'fs/promises';
import { basename, extname, join } from 'path';
import { existsSync } from 'fs';

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
