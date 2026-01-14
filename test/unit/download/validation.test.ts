import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUrl } from '../../../src/lib/download/validation.js';
import type { LookupAddress } from 'dns';

// Mock dns/promises module
vi.mock('dns/promises', () => ({
  lookup: vi.fn()
}));

describe('validateUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid URLs', () => {
    it('should accept https URLs', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
      await expect(validateUrl('https://youtube.com/watch?v=test')).resolves.toBeUndefined();
    });

    it('should accept http URLs', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
      await expect(validateUrl('http://example.com/video.mp4')).resolves.toBeUndefined();
    });
  });

  describe('protocol validation', () => {
    it('should reject file:// protocol', async () => {
      await expect(validateUrl('file:///etc/passwd')).rejects.toThrow('Unsupported protocol: file:');
    });

    it('should reject ftp:// protocol', async () => {
      await expect(validateUrl('ftp://example.com/video')).rejects.toThrow('Unsupported protocol: ftp:');
    });

    it('should reject javascript: protocol', async () => {
      await expect(validateUrl('javascript:alert(1)')).rejects.toThrow('Unsupported protocol: javascript:');
    });
  });

  describe('SSRF prevention', () => {
    it('should reject localhost', async () => {
      await expect(validateUrl('http://localhost/video')).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject 127.0.0.1', async () => {
      await expect(validateUrl('http://127.0.0.1/video')).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject ::1 (IPv6 localhost)', async () => {
      await expect(validateUrl('http://[::1]/video')).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject 192.168.x.x private range', async () => {
      await expect(validateUrl('http://192.168.1.1/video')).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject 10.x.x.x private range', async () => {
      await expect(validateUrl('http://10.0.0.1/video')).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject 172.16.x.x private range', async () => {
      await expect(validateUrl('http://172.16.0.1/video')).rejects.toThrow('Private IP addresses are not allowed');
    });
  });

  describe('malformed URLs', () => {
    it('should reject URLs without hostname', async () => {
      await expect(validateUrl('http://')).rejects.toThrow('Invalid URL');
    });

    it('should reject URLs with spaces', async () => {
      await expect(validateUrl('https://evil .com/video')).rejects.toThrow('Invalid URL');
    });

    it('should reject protocol smuggling attempts', async () => {
      await expect(validateUrl('https://evil.com%00@localhost/video')).rejects.toThrow();
    });
  });

  describe('DNS resolution SSRF prevention', () => {
    it('rejects domain resolving to private IP (192.168.x.x)', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '192.168.1.100', family: 4 }
      ]);

      await expect(validateUrl('http://evil-domain.com/video'))
        .rejects
        .toThrow(/resolves to private IP 192\.168\.1\.100/);
    });

    it('rejects domain resolving to loopback IP', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '127.0.0.1', family: 4 }
      ]);

      await expect(validateUrl('http://localhost-bypass.com/video'))
        .rejects
        .toThrow(/resolves to private IP 127\.0\.0\.1/);
    });

    it('rejects domain resolving to 10.x.x.x range', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '10.0.0.5', family: 4 }
      ]);

      await expect(validateUrl('http://internal-bypass.com/video'))
        .rejects
        .toThrow(/resolves to private IP 10\.0\.0\.5/);
    });

    it('rejects domain resolving to 172.16-31.x.x range', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '172.20.10.5', family: 4 }
      ]);

      await expect(validateUrl('http://docker-bypass.com/video'))
        .rejects
        .toThrow(/resolves to private IP 172\.20\.10\.5/);
    });

    it('rejects domain resolving to link-local IP (169.254.x.x)', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '169.254.1.1', family: 4 }
      ]);

      await expect(validateUrl('http://link-local-bypass.com/video'))
        .rejects
        .toThrow(/resolves to private IP 169\.254\.1\.1/);
    });

    it('rejects domain resolving to IPv6 localhost', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '::1', family: 6 }
      ]);

      await expect(validateUrl('http://ipv6-bypass.com/video'))
        .rejects
        .toThrow(/resolves to private IP ::1/);
    });

    it('accepts domain resolving to public IP', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '8.8.8.8', family: 4 }
      ]);

      await expect(validateUrl('http://public-domain.com/video'))
        .resolves
        .toBeUndefined();
    });

    it('handles DNS lookup failures gracefully', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockRejectedValue(new Error('ENOTFOUND'));

      await expect(validateUrl('http://nonexistent-domain.com/video'))
        .rejects
        .toThrow(/DNS resolution failed: ENOTFOUND/);
    });

    it('handles multiple DNS A records (checks all IPs)', async () => {
      const { lookup } = await import('dns/promises');
      vi.mocked(lookup).mockResolvedValue([
        { address: '8.8.8.8', family: 4 },
        { address: '192.168.1.1', family: 4 } // Private IP in list
      ]);

      await expect(validateUrl('http://mixed-ips.com/video'))
        .rejects
        .toThrow(/resolves to private IP 192\.168\.1\.1/);
    });
  });
});
