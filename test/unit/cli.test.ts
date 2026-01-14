import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli.js';

describe('CLI', () => {
  it('should parse basic input and output', () => {
    const config = parseArgs(['node', 'media-scan', 'video.mp4', '--output', './out']);
    expect(config.inputs).toEqual(['video.mp4']);
    expect(config.output).toBe('./out');
  });

  it('should use default output directory', () => {
    const config = parseArgs(['node', 'media-scan', 'video.mp4']);
    expect(config.output).toBe('./media-scan-output');
  });

  it('should parse min-freeze option', () => {
    const config = parseArgs(['node', 'media-scan', 'video.mp4', '--min-freeze', '5']);
    expect(config.minFreeze).toBe(5);
  });

  it('should parse multiple inputs', () => {
    const config = parseArgs(['node', 'media-scan', 'v1.mp4', 'v2.mp4']);
    expect(config.inputs).toEqual(['v1.mp4', 'v2.mp4']);
  });
});
