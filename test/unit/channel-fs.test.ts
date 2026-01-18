import { describe, it, expect } from 'vitest';
import {
  sanitizeName,
  getChannelVideoPath,
  getChannelStillPath,
  getChannelReportPath
} from '../../src/utils/channel-fs.js';

describe('Channel Filesystem Utilities', () => {
  describe('sanitizeName', () => {
    it('should replace invalid filesystem characters', () => {
      expect(sanitizeName('video<>:"/\\|?*name')).toBe('video_name');
    });

    it('should replace whitespace with underscores', () => {
      expect(sanitizeName('my video name')).toBe('my_video_name');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeName('video___name')).toBe('video_name');
    });

    it('should trim leading and trailing underscores', () => {
      expect(sanitizeName('___video_name___')).toBe('video_name');
    });

    it('should limit length to 200 characters', () => {
      const longName = 'a'.repeat(250);
      expect(sanitizeName(longName)).toHaveLength(200);
    });

    it('should handle empty string', () => {
      expect(sanitizeName('')).toBe('');
    });
  });

  describe('getChannelVideoPath', () => {
    it('should generate correct path structure', () => {
      const path = getChannelVideoPath('/output', 'MyChannel', 'Video Title');
      expect(path).toBe('/output/MyChannel/Video_Title');
    });

    it('should sanitize channel and video names', () => {
      const path = getChannelVideoPath('/output', 'My<Channel>', 'Video: Title');
      expect(path).toBe('/output/My_Channel/Video_Title');
    });
  });

  describe('getChannelStillPath', () => {
    it('should generate correct still path with jpg format', () => {
      const path = getChannelStillPath('/output', 'MyChannel', 'Video Title', 1, 'jpg');
      expect(path).toBe('/output/MyChannel/Video_Title/still_0001.jpg');
    });

    it('should generate correct still path with png format', () => {
      const path = getChannelStillPath('/output', 'MyChannel', 'Video Title', 5, 'png');
      expect(path).toBe('/output/MyChannel/Video_Title/still_0005.png');
    });

    it('should pad frame index correctly', () => {
      const path = getChannelStillPath('/output', 'MyChannel', 'Video', 123, 'jpg');
      expect(path).toBe('/output/MyChannel/Video/still_0123.jpg');
    });
  });

  describe('getChannelReportPath', () => {
    it('should generate correct channel report path', () => {
      const path = getChannelReportPath('/output', 'MyChannel');
      expect(path).toBe('/output/MyChannel/channel-report.json');
    });

    it('should sanitize channel name', () => {
      const path = getChannelReportPath('/output', 'My Channel!');
      expect(path).toBe('/output/My_Channel/channel-report.json');
    });
  });
});
