import { describe, test, expect } from 'vitest';
import { join } from 'path';

/**
 * Test that verifies Python classifier output paths match TypeScript frame paths
 * for batch classification integration in channel mode.
 */
describe('Batch Classification Path Matching', () => {
  test('Python output path should match TypeScript frame path construction', () => {
    // Simulate Python classifier output (from glob of OUTPUT/AudioPilz)
    const pythonOutputPath = 'OUTPUT/AudioPilz/Bad_Gear_-_Analog_Four/still_0001.jpg';

    // Simulate TypeScript frame.file (relative from output root)
    const frameFile = 'AudioPilz/Bad_Gear_-_Analog_Four/still_0001.jpg';
    const configOutput = 'OUTPUT';

    // This is what TypeScript does in parallel.ts line 123
    const typescriptFramePath = join(configOutput, frameFile);

    // Paths should match for lookup in Map
    expect(typescriptFramePath).toBe(pythonOutputPath);
  });

  test('Absolute config.output should also work', () => {
    const projectRoot = '/Users/test/project';
    const pythonOutputPath = join(projectRoot, 'OUTPUT/AudioPilz/Video1/still_0001.jpg');

    const frameFile = 'AudioPilz/Video1/still_0001.jpg';
    const configOutput = join(projectRoot, 'OUTPUT');

    const typescriptFramePath = join(configOutput, frameFile);

    expect(typescriptFramePath).toBe(pythonOutputPath);
  });

  test('Path.normalize should not cause mismatches', () => {
    // Test that path separators are consistent
    const path1 = join('OUTPUT', 'AudioPilz', 'Video', 'still_0001.jpg');
    const path2 = 'OUTPUT/AudioPilz/Video/still_0001.jpg';

    expect(path1).toBe(path2);
  });
});
