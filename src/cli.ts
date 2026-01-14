#!/usr/bin/env node
import { Command } from 'commander';
import type { Config } from './lib/types.js';
import { runPipeline } from './lib/pipeline.js';
import { setVerbose } from './utils/logger.js';
import { existsSync } from 'fs';

async function validateConfig(config: Config): Promise<void> {
  // Check inputs exist
  for (const input of config.inputs) {
    if (!existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
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
}

export function parseArgs(argv: string[]): Config {
  const program = new Command();

  program
    .name('media-scan')
    .description('Extract unique still images from videos using FFmpeg freezedetect')
    .version('1.0.0')
    .argument('<input...>', 'input video file(s)')
    .option('--output <dir>', 'output directory', './media-scan-output')
    .option('--min-freeze <seconds>', 'minimum freeze duration (freezedetect d)', '0.5')
    .option('--noise <dB>', 'freeze detection noise threshold (freezedetect n)', '-60dB')
    .option('--format <jpg|png>', 'output image format', 'jpg')
    .option('--hash <phash>', 'perceptual hash algorithm', 'phash')
    .option('--hash-distance <int>', 'Hamming distance threshold for deduplication', '6')
    .option('--keep-duplicates', 'write duplicate images (not just canonicals)', false)
    .option('--json <filename>', 'report filename', 'report.json')
    .option('--verbose', 'log FFmpeg commands and detailed output', false);

  program.parse(argv);

  const opts = program.opts();
  const inputs = program.args;

  return {
    inputs,
    output: opts.output,
    minFreeze: parseFloat(opts.minFreeze),
    noise: opts.noise,
    format: opts.format as 'jpg' | 'png',
    hash: opts.hash as 'phash',
    hashDistance: parseInt(opts.hashDistance, 10),
    keepDuplicates: opts.keepDuplicates,
    json: opts.json,
    verbose: opts.verbose
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
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
