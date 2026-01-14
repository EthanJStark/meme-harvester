import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateYtDlp, downloadUrl, isUrl } from '../../../src/lib/download/ytdlp.js';
import { execa } from 'execa';
import { readdir, mkdtemp, writeFile, symlink, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

vi.mock('execa');
vi.mock('fs/promises');

describe('yt-dlp Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isUrl', () => {
    describe('valid URLs', () => {
      it('should return true for https URLs', () => {
        expect(isUrl('https://example.com/video')).toBe(true);
      });

      it('should return true for http URLs', () => {
        expect(isUrl('http://example.com/video')).toBe(true);
      });
    });

    describe('invalid URLs', () => {
      it('should return false for malformed URLs without hostname', () => {
        expect(isUrl('http://')).toBe(false);
      });

      it('should return false for URLs with spaces', () => {
        expect(isUrl('https://evil .com/video')).toBe(false);
      });

      it('should return true for URLs with auth (validateUrl will catch security issues)', () => {
        // isUrl() just checks if it's a valid URL, validateUrl() handles security
        expect(isUrl('https://evil.com%00@localhost/video')).toBe(true);
      });

      it('should return false for ftp URLs', () => {
        expect(isUrl('ftp://example.com/video')).toBe(false);
      });

      it('should return false for file URLs', () => {
        expect(isUrl('file:///etc/passwd')).toBe(false);
      });

      it('should return false for plain text', () => {
        expect(isUrl('not a url')).toBe(false);
      });

      it('should return false for file paths', () => {
        expect(isUrl('/path/to/video.mp4')).toBe(false);
        expect(isUrl('./video.mp4')).toBe(false);
        expect(isUrl('video.mp4')).toBe(false);
      });
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
      ]), expect.objectContaining({
        timeout: 300000
      }));
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
      const mockTempDir = '/tmp/meme-harvester-test';
      await expect(downloadUrl('file:///etc/passwd', mockTempDir)).rejects.toThrow('Unsupported protocol: file:');
    });

    it('should reject localhost URLs', async () => {
      const mockTempDir = '/tmp/meme-harvester-test';
      await expect(downloadUrl('http://localhost/video', mockTempDir)).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should reject private IP URLs', async () => {
      const mockTempDir = '/tmp/meme-harvester-test';
      await expect(downloadUrl('http://192.168.1.1/video', mockTempDir)).rejects.toThrow('Private IP addresses are not allowed');
    });

    it('should use --restrict-filenames flag', async () => {
      const mockUrl = 'https://example.com/video';
      const mockTempDir = '/tmp/meme-harvester-test';

      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0
      } as any);

      vi.mocked(readdir).mockResolvedValueOnce(['video.mp4'] as any);

      await downloadUrl(mockUrl, mockTempDir);

      const execaCall = vi.mocked(execa).mock.calls[0];
      const args = execaCall[1];
      expect(args).toContain('--restrict-filenames');
    });

    // Note: Full symlink test would require integration testing
    // For now, we'll add the path validation logic and verify it compiles

    it('should timeout after 5 minutes', async () => {
      const mockUrl = 'https://example.com/slow';
      const mockTempDir = '/tmp/meme-harvester-test';

      // Mock execa to simulate timeout
      const timeoutError = new Error('Timeout') as any;
      timeoutError.timedOut = true;
      vi.mocked(execa).mockRejectedValueOnce(timeoutError);

      await expect(downloadUrl(mockUrl, mockTempDir)).rejects.toThrow(
        'Download timed out after 5 minutes'
      );
    });

    it('should include URL in timeout error message', async () => {
      const testUrl = 'https://example.com/huge-video';
      const mockTempDir = '/tmp/meme-harvester-test';

      const timeoutError = new Error('Timeout') as any;
      timeoutError.timedOut = true;
      vi.mocked(execa).mockRejectedValueOnce(timeoutError);

      await expect(downloadUrl(testUrl, mockTempDir)).rejects.toThrow(testUrl);
    });

    it('should throw error when multiple files are downloaded', async () => {
      const mockUrl = 'https://example.com/playlist';
      const mockTempDir = '/tmp/meme-harvester-test';

      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0
      } as any);

      vi.mocked(readdir).mockResolvedValueOnce(['video1.mp4', 'video2.mp4', 'video3.mp4'] as any);

      await expect(downloadUrl(mockUrl, mockTempDir)).rejects.toThrow(
        'Expected 1 file but got 3 files'
      );
    });

    it('should list all filenames in multiple files error', async () => {
      const mockUrl = 'https://example.com/playlist';
      const mockTempDir = '/tmp/meme-harvester-test';

      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0
      } as any);

      vi.mocked(readdir).mockResolvedValueOnce(['video1.mp4', 'video2.mp4'] as any);

      await expect(downloadUrl(mockUrl, mockTempDir)).rejects.toThrow(
        'video1.mp4, video2.mp4'
      );
    });
  });
});
