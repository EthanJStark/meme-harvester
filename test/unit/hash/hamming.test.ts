import { describe, it, expect } from 'vitest';
import { hammingDistance } from '../../../src/lib/hash/hamming.js';

describe('Hamming Distance', () => {
  it('should calculate distance between identical hashes', () => {
    const dist = hammingDistance('abc123', 'abc123');
    expect(dist).toBe(0);
  });

  it('should calculate distance between different hashes', () => {
    // Binary: 1010 vs 1100 = 2 bits different
    const dist = hammingDistance('a', 'c'); // 'a'=1010, 'c'=1100
    expect(dist).toBe(2);
  });

  it('should handle long hex strings', () => {
    const hash1 = 'abc123def456';
    const hash2 = 'abc123def457'; // last digit differs by 1 bit
    const dist = hammingDistance(hash1, hash2);
    expect(dist).toBeGreaterThanOrEqual(1);
  });
});
