#!/usr/bin/env node
import { Command } from 'commander';
import type { Config } from './lib/types.js';
import { runPipeline } from './lib/pipeline.js';
import { setVerbose } from './utils/logger.js';
import { existsSync } from 'fs';
import { isUrl } from './lib/download/ytdlp.js';

async function validateConfig(config: Config): Promise<void> {
  // Check inputs exist (skip validation for URLs and channel mode)
  if (config.inputs) {
    for (const input of config.inputs) {
      if (!isUrl(input) && !existsSync(input)) {
        throw new Error(`Input file not found: ${input}`);
      }
    }
  }

  // Check min-freeze is positive
  if (config.minFreeze <= 0) {
    throw new Error('--min-freeze must be positive');
  }

  // Check hash-distance is non-negative
  if (config.hashDistance < 0) {
    throw new Error('--hash-distance must be non-negative');
  }

  // Check format is valid
  if (!['jpg', 'png'].includes(config.format)) {
    throw new Error('--format must be jpg or png');
  }

  // Check concurrency is positive
  if (config.concurrency <= 0) {
    throw new Error('--concurrency must be positive');
  }
}

export function parseArgs(argv: string[]): Config {
  const program = new Command();

  program
    .name('harvest')
    .description('Extract unique still images from videos using FFmpeg freezedetect')
    .version('1.0.0')
    .argument('[input...]', 'input video file(s)')
    .option('--url <url>', 'download and process video from URL (using yt-dlp)')
    .option('--channel <url>', 'process all videos from YouTube channel')
    .option('--concurrency <n>', 'concurrent video processing limit (channel mode only)', '2')
    .option('--channel-timeout <ms>', 'channel discovery timeout in milliseconds', '60000')
    .option('--output <dir>', 'output directory', 'OUTPUT')
    .option('--min-freeze <seconds>', 'minimum freeze duration (freezedetect d)', '0.5')
    .option('--noise <dB>', 'freeze detection noise threshold (freezedetect n)', '-60dB')
    .option('--format <jpg|png>', 'output image format', 'jpg')
    .option('--hash <phash>', 'perceptual hash algorithm', 'phash')
    .option('--hash-distance <int>', 'Hamming distance threshold for deduplication', '6')
    .option('--keep-duplicates', 'write duplicate images (not just canonicals)', false)
    .option('--json <filename>', 'report filename', 'report.json')
    .option('--verbose', 'log FFmpeg commands and detailed output', false)
    .option('--classify', 'run ML classification on extracted frames', false);

  program.parse(argv);

  const opts = program.opts();
  const fileInputs = program.args;

  // Validate mutually exclusive inputs
  const hasFileInputs = fileInputs.length > 0;
  const hasUrl = !!opts.url;
  const hasChannel = !!opts.channel;

  const inputModeCount = [hasFileInputs, hasUrl, hasChannel].filter(Boolean).length;

  if (inputModeCount === 0) {
    throw new Error('Must specify either file input(s), --url, or --channel');
  }
  if (inputModeCount > 1) {
    throw new Error('Cannot combine file inputs, --url, and --channel (only one input mode allowed)');
  }

  // Validate channel URL format if provided
  if (hasChannel) {
    const channelPatterns = [
      /@[\w-]+/,           // @username
      /\/channel\/[\w-]+/, // /channel/ID
      /\/c\/[\w-]+/        // /c/name
    ];
    const isValidChannelUrl = channelPatterns.some(pattern => pattern.test(opts.channel));
    if (!isValidChannelUrl) {
      throw new Error(
        'Invalid channel URL format. Expected patterns:\n' +
        '  - https://www.youtube.com/@username\n' +
        '  - https://www.youtube.com/channel/CHANNEL_ID\n' +
        '  - https://www.youtube.com/c/channelname'
      );
    }
  }

  const inputs = hasUrl ? [opts.url] : hasChannel ? undefined : fileInputs;

  return {
    inputs,
    channelUrl: opts.channel,
    concurrency: parseInt(opts.concurrency, 10),
    channelTimeout: parseInt(opts.channelTimeout, 10),
    output: opts.output,
    minFreeze: parseFloat(opts.minFreeze),
    noise: opts.noise,
    format: opts.format as 'jpg' | 'png',
    hash: opts.hash as 'phash',
    hashDistance: parseInt(opts.hashDistance, 10),
    keepDuplicates: opts.keepDuplicates,
    json: opts.json,
    verbose: opts.verbose,
    classify: opts.classify
  };
}

async function main() {
  try {
    const config = parseArgs(process.argv);
    await validateConfig(config);
    setVerbose(config.verbose);

    await runPipeline(config);
  } catch (error: any) {
    if (error.code === 'ENOENT' && error.path?.includes('ffmpeg')) {
      console.error('Error: FFmpeg not found in PATH');
      console.error('Please install FFmpeg: https://ffmpeg.org/download.html');
      process.exit(1);
    }

    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Only run main if this is the entry point
// Handle different execution contexts (direct execution, wrapper scripts, etc.)
if (import.meta.url.startsWith('file://')) {
  const modulePath = new URL(import.meta.url).pathname;
  const scriptPath = process.argv[1];

  // Match if paths are identical or if module path ends with script path
  // This handles both direct execution and wrapper script execution
  if (modulePath === scriptPath || scriptPath?.endsWith('cli.js')) {
    main().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}
