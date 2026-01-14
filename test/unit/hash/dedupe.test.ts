import { describe, it, expect } from 'vitest';
import { deduplicateFrames } from '../../../src/lib/hash/dedupe.js';
import type { Frame } from '../../../src/lib/types.js';

describe('Deduplication', () => {
  it('should create single cluster for identical hashes', () => {
    const frames: Frame[] = [
      { id: 'frm_001', intervalId: 'int_001', timestampSec: 10, file: 'a.jpg', hash: 'abc123', hashAlgo: 'phash', hashBits: 64, isCanonical: false },
      { id: 'frm_002', intervalId: 'int_002', timestampSec: 20, file: 'b.jpg', hash: 'abc123', hashAlgo: 'phash', hashBits: 64, isCanonical: false }
    ];

    const clusters = deduplicateFrames(frames, 6);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
    expect(clusters[0].maxDistance).toBe(0);
  });

  it('should create separate clusters for distant hashes', () => {
    const frames: Frame[] = [
      { id: 'frm_001', intervalId: 'int_001', timestampSec: 10, file: 'a.jpg', hash: '0000000000000000', hashAlgo: 'phash', hashBits: 64, isCanonical: false },
      { id: 'frm_002', intervalId: 'int_002', timestampSec: 20, file: 'b.jpg', hash: 'ffffffffffffffff', hashAlgo: 'phash', hashBits: 64, isCanonical: false }
    ];

    const clusters = deduplicateFrames(frames, 6);

    expect(clusters).toHaveLength(2);
  });

  it('should mark first frame as canonical', () => {
    const frames: Frame[] = [
      { id: 'frm_001', intervalId: 'int_001', timestampSec: 10, file: 'a.jpg', hash: 'abc', hashAlgo: 'phash', hashBits: 64, isCanonical: false },
      { id: 'frm_002', intervalId: 'int_002', timestampSec: 20, file: 'b.jpg', hash: 'abc', hashAlgo: 'phash', hashBits: 64, isCanonical: false }
    ];

    const clusters = deduplicateFrames(frames, 6);

    expect(frames[0].isCanonical).toBe(true);
    expect(frames[1].isCanonical).toBe(false);
  });
});
