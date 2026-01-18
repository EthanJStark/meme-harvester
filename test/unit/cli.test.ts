import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli.js';

describe('CLI', () => {
  it('should parse basic input and output', () => {
    const config = parseArgs(['node', 'harvest', 'video.mp4', '--output', './out']);
    expect(config.inputs).toEqual(['video.mp4']);
    expect(config.output).toBe('./out');
  });

  it('should use default output directory', () => {
    const config = parseArgs(['node', 'harvest', 'video.mp4']);
    expect(config.output).toBe('OUTPUT');
  });

  it('should parse min-freeze option', () => {
    const config = parseArgs(['node', 'harvest', 'video.mp4', '--min-freeze', '5']);
    expect(config.minFreeze).toBe(5);
  });

  it('should parse multiple inputs', () => {
    const config = parseArgs(['node', 'harvest', 'v1.mp4', 'v2.mp4']);
    expect(config.inputs).toEqual(['v1.mp4', 'v2.mp4']);
  });

  it('should default classify to false', () => {
    const config = parseArgs(['node', 'harvest', 'video.mp4']);
    expect(config.classify).toBe(false);
  });

  it('should enable classify when flag provided', () => {
    const config = parseArgs(['node', 'harvest', 'video.mp4', '--classify']);
    expect(config.classify).toBe(true);
  });
});
