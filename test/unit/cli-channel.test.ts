import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli.js';

describe('CLI Channel Mode', () => {
  describe('channel flag', () => {
    it('should accept valid @username channel URL', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/@AudioPilz']);
      expect(config.channelUrl).toBe('https://www.youtube.com/@AudioPilz');
      expect(config.inputs).toBeUndefined();
    });

    it('should accept valid /channel/ID URL', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/channel/UC123ABC']);
      expect(config.channelUrl).toBe('https://www.youtube.com/channel/UC123ABC');
    });

    it('should accept valid /c/name URL', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/c/mychannel']);
      expect(config.channelUrl).toBe('https://www.youtube.com/c/mychannel');
    });

    it('should reject invalid channel URL format', () => {
      expect(() => {
        parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/watch?v=abc']);
      }).toThrow(/Invalid channel URL format/);
    });

    it('should set default concurrency to 2', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/@test']);
      expect(config.concurrency).toBe(2);
    });

    it('should accept custom concurrency', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/@test', '--concurrency', '4']);
      expect(config.concurrency).toBe(4);
    });

    it('should default channel timeout to 60000ms', () => {
      const config = parseArgs(['node', 'cli.js', '--channel', 'https://youtube.com/@test']);
      expect(config.channelTimeout).toBe(60000);
    });

    it('should accept custom channel timeout', () => {
      const config = parseArgs([
        'node', 'cli.js',
        '--channel', 'https://youtube.com/@test',
        '--channel-timeout', '120000'
      ]);
      expect(config.channelTimeout).toBe(120000);
    });
  });

  describe('input mode exclusivity', () => {
    it('should reject --channel with file inputs', () => {
      expect(() => {
        parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/@test', 'video.mp4']);
      }).toThrow(/Cannot combine/);
    });

    it('should reject --channel with --url', () => {
      expect(() => {
        parseArgs(['node', 'cli.js', '--channel', 'https://www.youtube.com/@test', '--url', 'https://example.com/video.mp4']);
      }).toThrow(/Cannot combine/);
    });

    it('should require at least one input mode', () => {
      expect(() => {
        parseArgs(['node', 'cli.js']);
      }).toThrow(/Must specify either/);
    });
  });
});
