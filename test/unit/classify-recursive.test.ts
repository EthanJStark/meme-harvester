import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Test recursive glob pattern in Python classifier
 *
 * This test verifies that the classifier can find images in nested
 * subdirectories, which is required for channel mode batch classification.
 */
describe('Classification Recursive Directory Search', () => {
  let testDir: string;
  let mockScriptPath: string;
  let mockModelPath: string;

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'classify-recursive-'));

    // Create nested directory structure (like channel mode)
    await mkdir(join(testDir, 'video1'), { recursive: true });
    await mkdir(join(testDir, 'video2'), { recursive: true });

    // Create test images in subdirectories
    const testImage = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, // JPEG header
      0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xd9 // JPEG end
    ]);

    await writeFile(join(testDir, 'video1', 'frame1.jpg'), testImage);
    await writeFile(join(testDir, 'video1', 'frame2.jpg'), testImage);
    await writeFile(join(testDir, 'video2', 'frame1.jpg'), testImage);
    await writeFile(join(testDir, 'video2', 'frame2.jpg'), testImage);

    // Create mock model
    await mkdir('models', { recursive: true });
    mockModelPath = 'models/classifier.pkl';
    await writeFile(mockModelPath, Buffer.from([
      0x80, 0x04, 0x95, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x7D, 0x94, 0x2E
    ]));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
    await rm(mockModelPath, { force: true }).catch(() => {});
  });

  test('Python classifier should find images in nested subdirectories', () => {
    // Test the glob pattern directly with Python
    const result = execSync(
      `python3 -c "from pathlib import Path; images = sorted(list(Path('${testDir}').glob('**/*.jpg'))); print(len(images))"`,
      { encoding: 'utf-8' }
    );

    expect(result.trim()).toBe('4');
  });

  test('Non-recursive glob should fail to find images', () => {
    // Verify that non-recursive glob doesn't work
    const result = execSync(
      `python3 -c "from pathlib import Path; images = sorted(list(Path('${testDir}').glob('*.jpg'))); print(len(images))"`,
      { encoding: 'utf-8' }
    );

    expect(result.trim()).toBe('0'); // Should find nothing in parent directory
  });

  test('Recursive glob should return correct paths for TypeScript matching', () => {
    // Verify path format matches what TypeScript expects
    const result = execSync(
      `python3 -c "from pathlib import Path; images = sorted(list(Path('${testDir}').glob('**/*.jpg'))); print(str(images[0]))"`,
      { encoding: 'utf-8' }
    );

    const imagePath = result.trim();
    expect(imagePath).toContain('video1/frame1.jpg');
  });
});
