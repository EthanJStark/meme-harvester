import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli.js';

describe('CLI --max-videos option', () => {
  it('should accept --max-videos flag with number', () => {
    const config = parseArgs(['node', 'harvest', '--channel', 'https://youtube.com/@test', '--max-videos', '3']);

    expect(config.maxVideos).toBe(3);
  });

  it('should default to undefined when not specified', () => {
    const config = parseArgs(['node', 'harvest', '--channel', 'https://youtube.com/@test']);

    expect(config.maxVideos).toBeUndefined();
  });
});
