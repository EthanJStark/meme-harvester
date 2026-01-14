import { execa } from 'execa';
import { logger } from '../../utils/logger.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { validateUrl } from './validation.js';

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
  // Validate URL before passing to yt-dlp
  validateUrl(url);

  logger.verbose(`Downloading ${url} to ${tempDir}`);

  // Use output template for predictable filenames
  const outputTemplate = path.join(tempDir, '%(title)s.%(ext)s');

  try {
    const { stdout, stderr } = await execa('yt-dlp', [
      '--no-playlist',           // Prevent multi-file downloads
      '--restrict-filenames',    // Sanitizes %(title)s to ASCII-only, no special chars
      '--quiet',                 // Minimize output
      '--progress',              // Show progress for parsing
      '--no-warnings',           // Suppress warnings
      '-o', outputTemplate,      // Output template
      url
    ], {
      timeout: 300000  // 5 minutes
    });

    logger.verbose(`yt-dlp output: ${stdout}`);
    if (stderr) {
      logger.verbose(`yt-dlp stderr: ${stderr}`);
    }

    // Find the downloaded file in the temp directory
    const files = await fs.readdir(tempDir);
    if (files.length === 0) {
      throw new Error('No files downloaded');
    }

    // Verify all files are actually inside tempDir (prevents symlink attacks)
    const resolvedTempDir = path.resolve(tempDir);
    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      const resolvedPath = path.resolve(fullPath);

      if (!resolvedPath.startsWith(resolvedTempDir)) {
        throw new Error(`Security violation: Downloaded file escaped temp directory`);
      }
    }

    // Fail loudly if multiple files downloaded
    if (files.length > 1) {
      const fileList = files.join(', ');
      throw new Error(
        `Expected 1 file but got ${files.length} files: ${fileList}. ` +
        `This may indicate a yt-dlp configuration issue.`
      );
    }

    const downloadedPath = path.join(tempDir, files[0]);
    logger.verbose(`Downloaded to: ${downloadedPath}`);

    return downloadedPath;
  } catch (error) {
    if (error && typeof error === 'object' && 'timedOut' in error && error.timedOut) {
      throw new Error(`Download timed out after 5 minutes: ${url}`);
    }
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
  // Quick protocol check first
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    return false;
  }

  // Validate with URL constructor
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
