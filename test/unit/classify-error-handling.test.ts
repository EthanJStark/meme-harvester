import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyBatch } from '../../src/lib/classify/classify.js';
import { existsSync } from 'fs';

// Mock fs and execa
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

vi.mock('execa', () => ({
  execa: vi.fn()
}));

describe('Classification Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty Map when model file missing', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = await classifyBatch('/tmp/test');

    expect(result.size).toBe(0);
  });

  it('should return empty Map when Python script missing', async () => {
    vi.mocked(existsSync)
      .mockReturnValueOnce(true)   // model exists
      .mockReturnValueOnce(false)  // venv doesn't exist
      .mockReturnValueOnce(false); // script missing

    const result = await classifyBatch('/tmp/test');

    expect(result.size).toBe(0);
  });

  it('should handle subprocess errors gracefully', async () => {
    const { execa } = await import('execa');

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(execa).mockRejectedValue(new Error('Python error'));

    const result = await classifyBatch('/tmp/test');

    expect(result.size).toBe(0);
  });

  it('should handle invalid JSON output', async () => {
    const { execa } = await import('execa');

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(execa).mockResolvedValue({
      stdout: 'invalid json',
      stderr: ''
    } as any);

    const result = await classifyBatch('/tmp/test');

    expect(result.size).toBe(0);
  });
});
