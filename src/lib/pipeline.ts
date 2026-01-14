import { probeVideo } from './ffmpeg/probe.js';
import { detectFreezeIntervals } from './ffmpeg/freezedetect.js';
import { extractFrame, calculateTimestamp } from './ffmpeg/extract.js';
import { computeHash } from './hash/phash.js';
import { deduplicateFrames } from './hash/dedupe.js';
import { generateReport, writeReport } from './report.js';
import { ensureOutputDir, getStillPath, ensureStillsDir } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { Config, InputResult, Frame } from './types.js';
import { join } from 'path';
import { execa } from 'execa';

async function validateFFmpeg(): Promise<void> {
  try {
    await execa('ffmpeg', ['-version']);
  } catch (error) {
    throw new Error('FFmpeg not found in PATH. Install from: https://ffmpeg.org/download.html');
  }
}

export async function processVideo(
  inputPath: string,
  config: Config
): Promise<InputResult> {
  logger.info(`Processing: ${inputPath}`);

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
  await ensureStillsDir(config.output, inputPath);

  // 4. Extract and hash frames
  const frames: Frame[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const timestamp = calculateTimestamp(interval.startSec, interval.endSec, probe.durationSec);
    const outputPath = getStillPath(config.output, inputPath, i + 1, config.format);

    logger.info(`  Extracting frame ${i + 1}/${intervals.length} at ${timestamp.toFixed(2)}s`);
    await extractFrame(inputPath, timestamp, outputPath, config.format);

    const hashResult = await computeHash(outputPath);

    frames.push({
      id: `frm_${String(i + 1).padStart(3, '0')}`,
      intervalId: interval.id,
      timestampSec: timestamp,
      file: outputPath.replace(config.output + '/', ''), // relative path
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

export async function runPipeline(config: Config): Promise<void> {
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
      const result = await processVideo(input, config);
      results.push(result);
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

  const report = generateReport(results);
  const reportPath = join(config.output, config.json);
  await writeReport(report, reportPath);

  if (errors.length > 0) {
    logger.info(`Completed with ${errors.length} error(s)`);
  } else {
    logger.info('Complete!');
  }
}
