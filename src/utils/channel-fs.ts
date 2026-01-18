import { mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Maximum filename length to avoid filesystem issues
 * Most filesystems support 255 bytes, but we use 200 to be safe
 * and leave room for prefixes/suffixes
 */
const MAX_FILENAME_LENGTH = 200;

/**
 * Sanitizes a string for use as a directory name
 * Replaces special characters with underscores and trims
 * @param name - The name to sanitize
 * @returns Sanitized directory name
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*!]/g, '_')  // Replace invalid filesystem chars
    .replace(/\s+/g, '_')             // Replace whitespace with underscores
    .replace(/_{2,}/g, '_')           // Collapse multiple underscores
    .replace(/^_+|_+$/g, '')          // Trim underscores
    .substring(0, MAX_FILENAME_LENGTH);
}

/**
 * Gets the output directory path for a channel video (no scan numbers)
 * @param outputRoot - The root output directory
 * @param channelName - The channel name
 * @param videoTitle - The video title
 * @returns The full path to the video's output directory
 */
export function getChannelVideoPath(
  outputRoot: string,
  channelName: string,
  videoTitle: string
): string {
  return join(outputRoot, sanitizeName(channelName), sanitizeName(videoTitle));
}

/**
 * Gets the path for a still image in channel mode
 * @param outputRoot - The root output directory
 * @param channelName - The channel name
 * @param videoTitle - The video title
 * @param frameIndex - The frame index (1-based)
 * @param format - The image format
 * @returns The full path to the still image
 */
export function getChannelStillPath(
  outputRoot: string,
  channelName: string,
  videoTitle: string,
  frameIndex: number,
  format: 'jpg' | 'png'
): string {
  const videoDir = getChannelVideoPath(outputRoot, channelName, videoTitle);
  const filename = `still_${String(frameIndex).padStart(4, '0')}.${format}`;
  return join(videoDir, filename);
}

/**
 * Ensures the output directory for a channel video exists
 * @param outputRoot - The root output directory
 * @param channelName - The channel name
 * @param videoTitle - The video title
 */
export async function ensureChannelVideoDir(
  outputRoot: string,
  channelName: string,
  videoTitle: string
): Promise<void> {
  const videoDir = getChannelVideoPath(outputRoot, channelName, videoTitle);
  await mkdir(videoDir, { recursive: true });
}

/**
 * Gets the path for the channel report
 * @param outputRoot - The root output directory
 * @param channelName - The channel name
 * @returns The full path to the channel report JSON
 */
export function getChannelReportPath(
  outputRoot: string,
  channelName: string
): string {
  return join(outputRoot, sanitizeName(channelName), 'channel-report.json');
}
