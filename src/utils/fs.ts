import { mkdir, readdir } from 'fs/promises';
import { basename, extname, join, resolve, relative, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { logger } from './logger.js';

/**
 * Validate that output path is within base directory (prevents path traversal)
 *
 * @param baseDir - Base directory to constrain paths within
 * @param userPath - User-provided path to validate
 * @returns Absolute validated path
 * @throws Error if path escapes base directory
 */
export function validateOutputPath(baseDir: string, userPath: string): string {
  // Resolve to absolute path
  const resolvedBase = resolve(baseDir);
  const resolvedPath = isAbsolute(userPath)
    ? resolve(userPath)
    : resolve(baseDir, userPath);

  // Check if resolved path is within base directory
  const relativePath = relative(resolvedBase, resolvedPath);

  // If relative path starts with '..', it's outside base directory
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(
      `Path traversal detected: '${userPath}' resolves outside base directory '${baseDir}'`
    );
  }

  return resolvedPath;
}

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
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
    logger.verbose(`Created output directory: ${outputDir}`);
  }
}

export function getStillsDir(
  outputDir: string,
  videoPath: string,
  scanNumber: number
): string {
  const videoName = basename(videoPath, extname(videoPath));
  return join(outputDir, videoName, String(scanNumber));
}

export function getStillPath(
  outputDir: string,
  videoPath: string,
  scanNumber: number,
  frameIndex: number,
  format: 'jpg' | 'png'
): string {
  const stillsDir = getStillsDir(outputDir, videoPath, scanNumber);
  const filename = `still_${String(frameIndex).padStart(4, '0')}.${format}`;
  return join(stillsDir, filename);
}

export async function ensureStillsDir(
  outputDir: string,
  videoPath: string,
  scanNumber: number
): Promise<void> {
  const stillsDir = getStillsDir(outputDir, videoPath, scanNumber);
  await mkdir(stillsDir, { recursive: true });
}
