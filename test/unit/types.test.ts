import { describe, it, expect } from 'vitest';
import type { FreezeInterval, Frame, DedupeCluster, Report, Config } from '../../src/lib/types.js';

describe('Types', () => {
  it('should allow valid FreezeInterval', () => {
    const interval: FreezeInterval = {
      id: 'int_001',
      startSec: 10.5,
      endSec: 20.3,
      durationSec: 9.8
    };
    expect(interval.id).toBe('int_001');
  });

  it('should allow FreezeInterval with null endSec', () => {
    const interval: FreezeInterval = {
      id: 'int_002',
      startSec: 100.0,
      endSec: null,
      durationSec: 5.0
    };
    expect(interval.endSec).toBeNull();
  });

  it('should allow valid Frame', () => {
    const frame: Frame = {
      id: 'frm_001',
      intervalId: 'int_001',
      timestampSec: 15.0,
      file: 'stills/video/still_0001.jpg',
      hash: 'abc123',
      hashAlgo: 'phash',
      hashBits: 64,
      isCanonical: true
    };
    expect(frame.hash).toBe('abc123');
  });
});
