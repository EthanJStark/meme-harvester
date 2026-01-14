import { describe, it, expect, vi } from 'vitest';
import { computeHash } from '../../../src/lib/hash/phash.js';

vi.mock('sharp-phash', () => ({
  default: vi.fn()
}));

describe('Perceptual Hash', () => {
  it('should compute pHash for image', async () => {
    const sharpPhash = (await import('sharp-phash')).default;
    vi.mocked(sharpPhash).mockResolvedValueOnce('abc123def456');

    const result = await computeHash('/tmp/image.jpg');

    expect(result).toEqual({
      hash: 'abc123def456',
      hashAlgo: 'phash',
      hashBits: 64
    });
  });

  it('should handle hash computation error', async () => {
    const sharpPhash = (await import('sharp-phash')).default;
    vi.mocked(sharpPhash).mockRejectedValueOnce(new Error('File not found'));

    await expect(computeHash('/invalid/path.jpg')).rejects.toThrow('File not found');
  });
});
