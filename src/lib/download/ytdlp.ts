import { execa } from 'execa';
import { logger } from '../../utils/logger.js';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Validates that yt-dlp is installed and available in PATH
 * @throws {Error} If yt-dlp is not found
 */
export async function validateYtDlp(): Promise<void> {
  try {
    await execa('yt-dlp', ['--version']);
    logger.verbose('yt-dlp is available');
  } catch (error) {
    throw new Error(
      'yt-dlp is not installed or not in PATH. ' +
      'Install from https://github.com/yt-dlp/yt-dlp'
    );
  }
}

/**
 * Downloads a video from a URL using yt-dlp
 * @param url - The URL to download from
 * @param tempDir - The temporary directory to download to
 * @returns The absolute path to the downloaded file
 * @throws {Error} If download fails
 */
export async function downloadUrl(url: string, tempDir: string): Promise<string> {
  logger.verbose(`Downloading ${url} to ${tempDir}`);

  // Use output template for predictable filenames
  const outputTemplate = path.join(tempDir, '%(title)s.%(ext)s');

  try {
    const { stdout, stderr } = await execa('yt-dlp', [
      '--no-playlist',           // Prevent multi-file downloads
      '--quiet',                 // Minimize output
      '--progress',              // Show progress for parsing
      '--no-warnings',           // Suppress warnings
      '-o', outputTemplate,      // Output template
      url
    ]);

    logger.verbose(`yt-dlp output: ${stdout}`);
    if (stderr) {
      logger.verbose(`yt-dlp stderr: ${stderr}`);
    }

    // Find the downloaded file in the temp directory
    const files = await fs.readdir(tempDir);
    if (files.length === 0) {
      throw new Error('No files downloaded');
    }
    if (files.length > 1) {
      logger.verbose(`Multiple files found, using first: ${files[0]}`);
    }

    const downloadedPath = path.join(tempDir, files[0]);
    logger.verbose(`Downloaded to: ${downloadedPath}`);

    return downloadedPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download ${url}: ${message}`);
  }
}

/**
 * Checks if a string is a valid URL
 * @param input - The string to check
 * @returns true if the input is a URL
 */
export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}
