import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateYtDlp, downloadUrl, isUrl } from '../../../src/lib/download/ytdlp.js';
import { execa } from 'execa';
import { readdir } from 'fs/promises';

vi.mock('execa');
vi.mock('fs/promises');

describe('yt-dlp Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isUrl', () => {
    it('should detect http:// URLs', () => {
      expect(isUrl('http://example.com/video.mp4')).toBe(true);
    });

    it('should detect https:// URLs', () => {
      expect(isUrl('https://www.youtube.com/watch?v=test')).toBe(true);
    });

    it('should reject file paths', () => {
      expect(isUrl('/path/to/video.mp4')).toBe(false);
      expect(isUrl('./video.mp4')).toBe(false);
      expect(isUrl('video.mp4')).toBe(false);
    });
  });

  describe('validateYtDlp', () => {
    it('should pass if yt-dlp is installed', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '2024.11.18',
        stderr: '',
        exitCode: 0
      } as any);

      await expect(validateYtDlp()).resolves.toBeUndefined();
      expect(execa).toHaveBeenCalledWith('yt-dlp', ['--version']);
    });

    it('should throw if yt-dlp is not found', async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error('Command not found'));

      await expect(validateYtDlp()).rejects.toThrow('yt-dlp is not installed');
    });
  });

  describe('downloadUrl', () => {
    it('should download URL and return file path', async () => {
      const mockUrl = 'https://example.com/video.mp4';
      const mockTempDir = '/tmp/meme-harvester-test';

      // Mock yt-dlp execution
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '[download] Destination: video.mp4\n[download] 100% of 1.23MiB',
        stderr: '',
        exitCode: 0
      } as any);

      // Mock readdir to return downloaded file
      vi.mocked(readdir).mockResolvedValueOnce(['video.mp4'] as any);

      const result = await downloadUrl(mockUrl, mockTempDir);

      expect(result).toBe('/tmp/meme-harvester-test/video.mp4');
      expect(execa).toHaveBeenCalledWith('yt-dlp', expect.arrayContaining([
        '--no-playlist',
        mockUrl
      ]));
    });

    it('should throw if download fails', async () => {
      const mockUrl = 'https://example.com/invalid';
      const mockTempDir = '/tmp/meme-harvester-test';

      vi.mocked(execa).mockRejectedValueOnce(new Error('ERROR: Video unavailable'));

      await expect(downloadUrl(mockUrl, mockTempDir)).rejects.toThrow('Failed to download');
    });

    it('should throw if no files downloaded', async () => {
      const mockUrl = 'https://example.com/video.mp4';
      const mockTempDir = '/tmp/meme-harvester-test';

      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0
      } as any);

      vi.mocked(readdir).mockResolvedValueOnce([] as any);

      await expect(downloadUrl(mockUrl, mockTempDir)).rejects.toThrow('No files downloaded');
    });

    it('should reject file:// protocol URLs', async () => {
      const mockTempDir = '/tmp/media-scan-test';
      await expect(downloadUrl('file:///etc/passwd', mockTempDir)).rejects.toThrow('Unsupported protocol: file:');
    });

    it('should reject localhost URLs', async () => {
      const mockTempDir = '/tmp/media-scan-test';
      await expect(downloadUrl('http://localhost/video', mockTempDir)).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject private IP URLs', async () => {
      const mockTempDir = '/tmp/media-scan-test';
      await expect(downloadUrl('http://192.168.1.1/video', mockTempDir)).rejects.toThrow('Private IP addresses are not allowed');
    });
  });
});
