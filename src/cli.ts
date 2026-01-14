#!/usr/bin/env node
import { Command } from 'commander';
import type { Config } from './lib/types.js';

export function parseArgs(argv: string[]): Config {
  const program = new Command();

  program
    .name('media-scan')
    .description('Extract unique still images from videos using FFmpeg freezedetect')
    .version('1.0.0')
    .argument('<input...>', 'input video file(s)')
    .option('--output <dir>', 'output directory', './media-scan-output')
    .option('--min-freeze <seconds>', 'minimum freeze duration (freezedetect d)', '2')
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

// Main entry point (will be implemented later)
async function main() {
  const config = parseArgs(process.argv);
  console.log('media-scan v1.0.0');
  console.log('Configuration:', config);
  console.log('Implementation coming in subsequent phases...');
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
