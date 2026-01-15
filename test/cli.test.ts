import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('should use OUTPUT as default output directory', () => {
    const config = parseArgs(['node', 'harvest', 'test.mp4']);
    expect(config.output).toBe('OUTPUT');
  });

  it('should allow custom output directory', () => {
    const config = parseArgs(['node', 'harvest', 'test.mp4', '--output', './custom']);
    expect(config.output).toBe('./custom');
  });
});
