import { logger } from '../utils/logger.js';
import { validateYtDlp, downloadUrl } from './download/ytdlp.js';
import { processVideo } from './pipeline.js';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import type { ChannelInfo, ChannelResult, Config, InputResult } from './types.js';

/**
 * Processes a single video from a channel (download, process, cleanup)
 * @param video - Video info (URL and title)
 * @param channelName - The channel name
 * @param config - Processing configuration
 * @param videoIndex - Current video index (1-based for logging)
 * @param totalVideos - Total number of videos
 * @returns Processing result
 */
async function processOneVideo(
  video: { url: string; title: string },
  channelName: string,
  config: Config,
  videoIndex: number,
  totalVideos: number
): Promise<InputResult> {
  logger.info(`[${videoIndex}/${totalVideos}] Processing: ${video.title}`);

  // Create temp directory for this video
  const tempDir = await mkdtemp(join(tmpdir(), 'meme-harvester-'));
  logger.verbose(`Created temp directory: ${tempDir}`);

  try {
    // Download video
    const downloadedPath = await downloadUrl(video.url, tempDir);

    // Process video with channel context
    const result = await processVideo(
      downloadedPath,
      config,
      video.url,
      { channelName, videoTitle: video.title }
    );

    logger.info(`[${videoIndex}/${totalVideos}] ✓ ${video.title}`);

    return result;
  } finally {
    // Always cleanup temp directory
    logger.verbose(`Cleaning up temp directory: ${tempDir}`);
    await rm(tempDir, { recursive: true, force: true }).catch(err => {
      logger.verbose(`Failed to cleanup temp directory ${tempDir}: ${err.message}`);
    });
  }
}

/**
 * Processes all videos from a channel with parallel batch processing
 * @param channelInfo - Channel information with video list
 * @param config - Processing configuration
 * @returns Channel processing result with successes and errors
 */
export async function processChannelVideos(
  channelInfo: ChannelInfo,
  config: Config
): Promise<ChannelResult> {
  await validateYtDlp();

  logger.info(`Processing channel: ${channelInfo.channelName}`);
  logger.info(`Total videos: ${channelInfo.videos.length}`);
  logger.info(`Concurrency: ${config.concurrency}`);

  const results: InputResult[] = [];
  const errors: Array<{ url: string; title: string; error: string }> = [];

  const totalVideos = channelInfo.videos.length;

  // Process videos in batches with concurrency control
  for (let i = 0; i < totalVideos; i += config.concurrency) {
    const batch = channelInfo.videos.slice(i, i + config.concurrency);
    const batchStart = i + 1;
    const batchEnd = Math.min(i + config.concurrency, totalVideos);

    logger.info(`Processing batch: videos ${batchStart}-${batchEnd} of ${totalVideos}...`);

    // Process batch in parallel
    const promises = batch.map((video, batchIndex) =>
      processOneVideo(video, channelInfo.channelName, config, i + batchIndex + 1, totalVideos)
    );

    const settled = await Promise.allSettled(promises);

    // Collect results and errors
    settled.forEach((outcome, idx) => {
      const video = batch[idx];
      const videoIndex = i + idx + 1;

      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        const errorMessage = outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
        logger.error(`[${videoIndex}/${totalVideos}] ✗ ${video.title}: ${errorMessage}`);
        errors.push({
          url: video.url,
          title: video.title,
          error: errorMessage
        });
      }
    });
  }

  // Summary
  logger.info(`Completed: ${results.length}/${totalVideos} videos succeeded, ${errors.length} failed`);

  return {
    channelInfo,
    results,
    errors
  };
}
