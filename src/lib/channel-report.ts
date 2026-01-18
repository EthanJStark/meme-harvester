import { writeFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import type { ChannelResult, Config, InputResult } from './types.js';
import { logger } from '../utils/logger.js';
import { getChannelReportPath, getChannelVideoPath } from '../utils/channel-fs.js';
import { writeReport, generateReport } from './report.js';

/**
 * Channel report schema
 */
interface ChannelReport {
  version: string;
  channelName: string;
  channelUrl: string;
  processedAt: string;
  config: {
    concurrency: number;
    minFreeze: number;
    noise: string;
    format: string;
    hashDistance: number;
    keepDuplicates: boolean;
    classify: boolean;
  };
  summary: {
    totalVideos: number;
    successCount: number;
    errorCount: number;
    totalFrames?: number;
    keepFrames?: number;
    excludeFrames?: number;
    unclassifiedFrames?: number;
  };
  videos: Array<{
    title: string;
    url: string;
    path: string;
    framesExtracted: number;
    uniqueFrames: number;
    keepFrames?: number;
    excludeFrames?: number;
  }>;
  errors: Array<{
    url: string;
    title: string;
    error: string;
  }>;
}

/**
 * Generates a channel report from processing results
 */
function generateChannelReport(
  channelResult: ChannelResult,
  config: Config
): ChannelReport {
  const { channelInfo, results, errors } = channelResult;

  // Calculate classification statistics
  let totalFrames = 0;
  let keepFrames = 0;
  let excludeFrames = 0;
  let unclassifiedFrames = 0;

  for (const result of results) {
    totalFrames += result.frames.length;
    for (const frame of result.frames) {
      if (frame.classification?.label === 'keep') {
        keepFrames++;
      } else if (frame.classification?.label === 'exclude') {
        excludeFrames++;
      } else {
        unclassifiedFrames++;
      }
    }
  }

  return {
    version: '1.0',
    channelName: channelInfo.channelName,
    channelUrl: channelInfo.channelUrl,
    processedAt: new Date().toISOString(),
    config: {
      concurrency: config.concurrency,
      minFreeze: config.minFreeze,
      noise: config.noise,
      format: config.format,
      hashDistance: config.hashDistance,
      keepDuplicates: config.keepDuplicates,
      classify: config.classify
    },
    summary: {
      totalVideos: channelInfo.videos.length,
      successCount: results.length,
      errorCount: errors.length,
      ...(config.classify && {
        totalFrames,
        keepFrames,
        excludeFrames,
        unclassifiedFrames
      })
    },
    videos: results.map(result => {
      const videoKeep = result.frames.filter(f => f.classification?.label === 'keep').length;
      const videoExclude = result.frames.filter(f => f.classification?.label === 'exclude').length;

      return {
        title: channelInfo.videos.find(v => v.url === result.sourceUrl)?.title || 'Unknown',
        url: result.sourceUrl || '',
        path: result.path,
        framesExtracted: result.frames.length,
        uniqueFrames: result.dedupe.clusters.length,
        ...(config.classify && {
          keepFrames: videoKeep,
          excludeFrames: videoExclude
        })
      };
    }),
    errors
  };
}

/**
 * Writes per-video reports and aggregate channel report
 */
export async function writeChannelReport(
  channelResult: ChannelResult,
  config: Config
): Promise<void> {
  const { channelInfo, results } = channelResult;

  // Write per-video reports
  for (const result of results) {
    const videoTitle = channelInfo.videos.find(v => v.url === result.sourceUrl)?.title || 'Unknown';
    const videoDir = getChannelVideoPath(config.output, channelInfo.channelName, videoTitle);
    const videoReportPath = join(videoDir, config.json);

    // Generate single-video report
    const videoReport = generateReport([result]);
    await writeReport(videoReport, videoReportPath);
  }

  // Write aggregate channel report
  const channelReportPath = getChannelReportPath(config.output, channelInfo.channelName);
  const channelReport = generateChannelReport(channelResult, config);

  logger.info(`Writing channel report to ${channelReportPath}`);

  // Ensure directory exists
  await mkdir(join(config.output, channelInfo.channelName), { recursive: true });

  // Write pretty JSON
  await writeFile(channelReportPath, JSON.stringify(channelReport, null, 2), 'utf-8');

  logger.info(`Channel report written: ${channelReportPath}`);
}
