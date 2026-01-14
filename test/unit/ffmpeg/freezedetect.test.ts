import { describe, it, expect } from 'vitest';
import { parseFreezedetectOutput } from '../../../src/lib/ffmpeg/freezedetect.js';

describe('Freezedetect Parser', () => {
  it('should parse freeze_start and freeze_end lines', () => {
    const stderr = `
[freezedetect @ 0x123] freeze_start: 12.300
[freezedetect @ 0x123] freeze_end: 21.900
[freezedetect @ 0x123] freeze_start: 45.100
[freezedetect @ 0x123] freeze_end: 50.000
    `.trim();

    const intervals = parseFreezedetectOutput(stderr);

    expect(intervals).toHaveLength(2);
    expect(intervals[0]).toMatchObject({
      id: 'int_001',
      startSec: 12.3,
      endSec: 21.9,
      durationSec: 9.6
    });
    expect(intervals[1]).toMatchObject({
      id: 'int_002',
      startSec: 45.1,
      endSec: 50.0,
      durationSec: 4.9
    });
  });

  it('should handle freeze_start without freeze_end (EOF)', () => {
    const stderr = `
[freezedetect @ 0x123] freeze_start: 100.000
    `.trim();

    const intervals = parseFreezedetectOutput(stderr);

    expect(intervals).toHaveLength(1);
    expect(intervals[0]).toMatchObject({
      id: 'int_001',
      startSec: 100.0,
      endSec: null
    });
  });

  it('should return empty array if no freezes detected', () => {
    const stderr = 'No freeze detected';
    const intervals = parseFreezedetectOutput(stderr);
    expect(intervals).toHaveLength(0);
  });
});
