import { describe, it, expect } from 'vitest';
import type { ClassificationResult } from '../../src/lib/classify/classify.js';

describe('Classification Types', () => {
  it('should define ClassificationResult interface', () => {
    const result: ClassificationResult = {
      path: '/path/to/image.jpg',
      label: 'keep',
      confidence: 0.85
    };

    expect(result.path).toBe('/path/to/image.jpg');
    expect(result.label).toBe('keep');
    expect(result.confidence).toBe(0.85);
  });

  it('should accept exclude label', () => {
    const result: ClassificationResult = {
      path: '/path/to/image.jpg',
      label: 'exclude',
      confidence: 0.92
    };

    expect(result.label).toBe('exclude');
  });
});
