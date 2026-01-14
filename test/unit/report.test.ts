import { describe, it, expect } from 'vitest';
import { generateReport } from '../../src/lib/report.js';
import type { InputResult } from '../../src/lib/types.js';

describe('Report Generation', () => {
  it('should generate v1 schema report', () => {
    const input: InputResult = {
      path: 'test.mp4',
      durationSec: 120.5,
      videoStream: '0:v:0',
      freezeDetect: {
        noise: '-60dB',
        minDurationSec: 2
      },
      intervals: [
        { id: 'int_001', startSec: 10, endSec: 20, durationSec: 10 }
      ],
      frames: [
        {
          id: 'frm_001',
          intervalId: 'int_001',
          timestampSec: 15,
          file: 'stills/test/still_0001.jpg',
          hash: 'abc123',
          hashAlgo: 'phash',
          hashBits: 64,
          isCanonical: true
        }
      ],
      dedupe: {
        clusters: [
          { canonicalFrameId: 'frm_001', members: ['frm_001'], maxDistance: 0 }
        ]
      }
    };

    const report = generateReport([input]);

    expect(report.version).toBe('1.0');
    expect(report.inputs).toHaveLength(1);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
