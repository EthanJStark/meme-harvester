import { describe, it, expect } from 'vitest';
import { validateUrl } from '../../../src/lib/download/validation.js';

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('should accept https URLs', () => {
      expect(() => validateUrl('https://youtube.com/watch?v=test')).not.toThrow();
    });

    it('should accept http URLs', () => {
      expect(() => validateUrl('http://example.com/video.mp4')).not.toThrow();
    });
  });

  describe('protocol validation', () => {
    it('should reject file:// protocol', () => {
      expect(() => validateUrl('file:///etc/passwd')).toThrow('Unsupported protocol: file:');
    });

    it('should reject ftp:// protocol', () => {
      expect(() => validateUrl('ftp://example.com/video')).toThrow('Unsupported protocol: ftp:');
    });

    it('should reject javascript: protocol', () => {
      expect(() => validateUrl('javascript:alert(1)')).toThrow('Unsupported protocol: javascript:');
    });
  });

  describe('SSRF prevention', () => {
    it('should reject localhost', () => {
      expect(() => validateUrl('http://localhost/video')).toThrow('Private IP addresses are not allowed');
    });

    it('should reject 127.0.0.1', () => {
      expect(() => validateUrl('http://127.0.0.1/video')).toThrow('Private IP addresses are not allowed');
    });

    it('should reject ::1 (IPv6 localhost)', () => {
      expect(() => validateUrl('http://[::1]/video')).toThrow('Private IP addresses are not allowed');
    });

    it('should reject 192.168.x.x private range', () => {
      expect(() => validateUrl('http://192.168.1.1/video')).toThrow('Private IP addresses are not allowed');
    });

    it('should reject 10.x.x.x private range', () => {
      expect(() => validateUrl('http://10.0.0.1/video')).toThrow('Private IP addresses are not allowed');
    });

    it('should reject 172.16.x.x private range', () => {
      expect(() => validateUrl('http://172.16.0.1/video')).toThrow('Private IP addresses are not allowed');
    });
  });

  describe('malformed URLs', () => {
    it('should reject URLs without hostname', () => {
      expect(() => validateUrl('http://')).toThrow('Invalid URL');
    });

    it('should reject URLs with spaces', () => {
      expect(() => validateUrl('https://evil .com/video')).toThrow('Invalid URL');
    });

    it('should reject protocol smuggling attempts', () => {
      expect(() => validateUrl('https://evil.com%00@localhost/video')).toThrow();
    });
  });
});
