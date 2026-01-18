import { probeVideo } from './ffmpeg/probe.js';
import { detectFreezeIntervals } from './ffmpeg/freezedetect.js';
import { extractFrame, calculateTimestamp } from './ffmpeg/extract.js';
import { computeHash } from './hash/phash.js';
import { deduplicateFrames } from './hash/dedupe.js';
import { generateReport, writeReport } from './report.js';
import {
  ensureOutputDir,
  getStillPath,
  ensureStillsDir,
  getNextScanNumber,
  getStillsDir
} from '../utils/fs.js';
import {
  getChannelVideoPath,
  getChannelStillPath,
  ensureChannelVideoDir
} from '../utils/channel-fs.js';
import { logger } from '../utils/logger.js';
import type { Config, InputResult, Frame } from './types.js';
import { basename, extname, join } from 'path';
import { execa } from 'execa';
import { validateYtDlp, downloadUrl, isUrl } from './download/ytdlp.js';
import { getChannelVideos } from './download/channel.js';
import { processChannelVideos } from './parallel.js';
import { writeChannelReport } from './channel-report.js';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { sep } from 'path';

async function validateFFmpeg(): Promise<void> {
  try {
    await execa('ffmpeg', ['-version']);
  } catch (error) {
    throw new Error('FFmpeg not found in PATH. Install from: https://ffmpeg.org/download.html');
  }
}

export async function processVideo(
  inputPath: string,
  config: Config,
  sourceUrl?: string,
  channelContext?: { channelName: string; videoTitle: string }
): Promise<InputResult> {
  logger.info(`Processing: ${inputPath}`);

  // Determine scan number and output paths
  let scanNumber: number;
  let stillsDir: string;

  if (channelContext) {
    // Channel mode: use fixed scan number and channel-specific paths
    scanNumber = 1;
    stillsDir = getChannelVideoPath(config.output, channelContext.channelName, channelContext.videoTitle);
    logger.verbose(`  Channel mode: ${channelContext.channelName}/${channelContext.videoTitle}`);
  } else {
    // Single video mode: calculate scan number
    const videoName = basename(inputPath, extname(inputPath));
    scanNumber = await getNextScanNumber(config.output, videoName);
    stillsDir = getStillsDir(config.output, inputPath, scanNumber);
    logger.info(`  Scan number: ${scanNumber}`);
  }

  // 1. Probe video
  const probe = await probeVideo(inputPath);
  logger.info(`  Duration: ${probe.durationSec}s, Stream: ${probe.videoStream}`);

  // 2. Detect freeze intervals
  const intervals = await detectFreezeIntervals(inputPath, config.minFreeze, config.noise);
  logger.info(`  Detected ${intervals.length} freeze intervals`);

  if (intervals.length === 0) {
    logger.info('  No freeze intervals detected, skipping extraction');
    return {
      path: inputPath,
      sourceUrl,
      scanNumber,
      durationSec: probe.durationSec,
      videoStream: probe.videoStream,
      freezeDetect: {
        noise: config.noise,
        minDurationSec: config.minFreeze
      },
      intervals: [],
      frames: [],
      dedupe: { clusters: [] }
    };
  }

  // 3. Ensure stills directory
  if (channelContext) {
    await ensureChannelVideoDir(config.output, channelContext.channelName, channelContext.videoTitle);
  } else {
    await ensureStillsDir(config.output, inputPath, scanNumber);
  }

  // 4. Extract and hash frames
  const frames: Frame[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const timestamp = calculateTimestamp(interval.startSec, interval.endSec, probe.durationSec);

    let outputPath: string;
    if (channelContext) {
      outputPath = getChannelStillPath(
        config.output,
        channelContext.channelName,
        channelContext.videoTitle,
        i + 1,
        config.format
      );
    } else {
      outputPath = getStillPath(config.output, inputPath, scanNumber, i + 1, config.format);
    }

    logger.info(`  Extracting frame ${i + 1}/${intervals.length} at ${timestamp.toFixed(2)}s`);
    await extractFrame(inputPath, timestamp, outputPath, config.format);

    const hashResult = await computeHash(outputPath);

    // Calculate relative path from output root
    const relativePath = outputPath.replace(config.output + '/', '');

    frames.push({
      id: `frm_${String(i + 1).padStart(3, '0')}`,
      intervalId: interval.id,
      timestampSec: timestamp,
      file: relativePath,
      hash: hashResult.hash,
      hashAlgo: hashResult.hashAlgo,
      hashBits: hashResult.hashBits,
      isCanonical: false
    });
  }

  // 5. Deduplicate
  const clusters = deduplicateFrames(frames, config.hashDistance);
  logger.info(`  Deduplication: ${frames.length} frames -> ${clusters.length} unique`);

  return {
    path: inputPath,
    sourceUrl,
    scanNumber,
    durationSec: probe.durationSec,
    videoStream: probe.videoStream,
    freezeDetect: {
      noise: config.noise,
      minDurationSec: config.minFreeze
    },
    intervals,
    frames,
    dedupe: { clusters }
  };
}

/**
 * Process an entire YouTube channel
 */
async function processChannel(config: Config): Promise<void> {
  if (!config.channelUrl) {
    throw new Error('Channel URL is required for channel mode');
  }

  await validateFFmpeg();
  await validateYtDlp();

  logger.info('Meme Harvester v1.0.0 - Channel Mode');
  logger.info(`Output directory: ${config.output}`);

  // Ensure output directory exists
  await ensureOutputDir(config.output);

  // 1. Discover channel videos
  const channelInfo = await getChannelVideos(config.channelUrl, config.channelTimeout);

  // 2. Process videos in parallel
  const channelResult = await processChannelVideos(channelInfo, config);

  // 3. Write channel report
  await writeChannelReport(channelResult, config);

  // 4. Exit with error if all videos failed
  if (channelResult.results.length === 0) {
    throw new Error('All channel videos failed to process');
  }

  logger.info('Complete!');
}

/**
 * Process single video(s)
 */
async function processSingleVideo(config: Config): Promise<void> {
  if (!config.inputs || config.inputs.length === 0) {
    throw new Error('No inputs provided for single video mode');
  }

  await validateFFmpeg();

  logger.info('Meme Harvester v1.0.0');
  logger.info(`Output directory: ${config.output}`);

  // Ensure output directory exists
  await ensureOutputDir(config.output);

  // Process each input sequentially
  const results: InputResult[] = [];
  const errors: Array<{ input: string; error: string }> = [];

  for (const input of config.inputs) {
    try {
      if (isUrl(input)) {
        // URL input: download, process, cleanup
        await validateYtDlp();
        const tempDir = await mkdtemp(join(tmpdir(), 'meme-harvester-'));
        logger.info(`Created temp directory: ${tempDir}`);

        try {
          const downloadedPath = await downloadUrl(input, tempDir);
          const result = await processVideo(downloadedPath, config, input);
          results.push(result);
        } finally {
          // Always cleanup temp directory
          logger.verbose(`Cleaning up temp directory: ${tempDir}`);
          await rm(tempDir, { recursive: true, force: true });
        }
      } else {
        // File input: process directly
        const result = await processVideo(input, config);
        results.push(result);
      }
    } catch (error: any) {
      logger.error(`Failed to process ${input}: ${error.message}`);
      errors.push({ input, error: error.message });

      if (config.inputs.length === 1) {
        throw error; // Re-throw if only one input
      }
    }
  }

  if (results.length === 0) {
    throw new Error('All inputs failed to process');
  }

  // Write report to scan-specific directory for single input
  // For multiple inputs, write to output root
  let reportPath: string;
  if (results.length === 1) {
    const result = results[0];
    const videoName = basename(result.path, extname(result.path));
    const scanDir = join(config.output, videoName, String(result.scanNumber));
    reportPath = join(scanDir, config.json);
  } else {
    reportPath = join(config.output, config.json);
  }

  const report = generateReport(results);
  await writeReport(report, reportPath);

  if (errors.length > 0) {
    logger.info(`Completed with ${errors.length} error(s)`);
  } else {
    logger.info('Complete!');
  }
}

export async function runPipeline(config: Config): Promise<void> {
  // Route to correct mode based on config
  if (config.channelUrl) {
    await processChannel(config);
  } else {
    await processSingleVideo(config);
  }
}
