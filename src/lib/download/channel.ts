import { execa } from 'execa';
import { logger } from '../../utils/logger.js';
import { validateUrl } from './validation.js';
import type { ChannelInfo } from '../types.js';

/**
 * Extracts channel name from YouTube channel URL
 * @param channelUrl - The channel URL
 * @returns The channel name (without @ or /channel/ prefix)
 */
function extractChannelName(channelUrl: string): string {
  try {
    const url = new URL(channelUrl);
    const pathname = url.pathname;

    // Handle @username format
    const atMatch = pathname.match(/@([\w-]+)/);
    if (atMatch) {
      return atMatch[1];
    }

    // Handle /channel/ID format
    const channelMatch = pathname.match(/\/channel\/([\w-]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    // Handle /c/name format
    const cMatch = pathname.match(/\/c\/([\w-]+)/);
    if (cMatch) {
      return cMatch[1];
    }

    // Fallback: use the whole pathname (sanitized)
    return pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'unknown_channel';
  } catch {
    return 'unknown_channel';
  }
}

/**
 * Retrieves all video URLs and titles from a YouTube channel
 * @param channelUrl - The YouTube channel URL
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param maxVideos - Optional limit on number of videos to return (for testing)
 * @returns Channel information including video list
 * @throws {Error} If channel discovery fails or channel is empty
 */
export async function getChannelVideos(
  channelUrl: string,
  timeoutMs: number = 60000,
  maxVideos?: number
): Promise<ChannelInfo> {
  // Validate URL for security (SSRF protection)
  await validateUrl(channelUrl);

  logger.verbose(`Discovering videos in channel: ${channelUrl}`);

  try {
    const { stdout, stderr } = await execa('yt-dlp', [
      '--flat-playlist',              // Don't download, just list
      '--print', '%(url)s|%(title)s', // Output URL and title separated by pipe
      '--no-warnings',                // Suppress warnings
      '--quiet',                      // Minimize output
      channelUrl
    ], {
      timeout: timeoutMs
    });

    if (stderr) {
      logger.verbose(`yt-dlp stderr: ${stderr}`);
    }

    // Parse output lines
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error('Channel contains no videos or is empty');
    }

    // Parse each line into video info
    const videos = lines.map(line => {
      const [url, title] = line.split('|', 2);
      if (!url || !title) {
        throw new Error(`Failed to parse video line: ${line}`);
      }
      return { url, title };
    });

    const channelName = extractChannelName(channelUrl);

    logger.verbose(`Found ${videos.length} videos in channel ${channelName}`);

    // Limit videos if maxVideos specified (for testing)
    let limitedVideos = videos;
    if (maxVideos !== undefined && maxVideos > 0) {
      logger.info(`Limiting to first ${maxVideos} videos (--max-videos flag)`);
      limitedVideos = videos.slice(0, maxVideos);
    }

    return {
      channelName,
      channelUrl,
      videos: limitedVideos
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'timedOut' in error && error.timedOut) {
      const timeoutSeconds = Math.round(timeoutMs / 1000);
      throw new Error(`Channel discovery timed out after ${timeoutSeconds}s: ${channelUrl}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve channel videos: ${message}`);
  }
}
