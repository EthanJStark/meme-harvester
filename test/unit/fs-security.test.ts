import { describe, test, expect } from 'vitest';
import { validateOutputPath } from '../../src/utils/fs.js';
import { join } from 'path';

describe('validateOutputPath', () => {
  const baseDir = '/Users/test/project';

  test('should allow paths within base directory', () => {
    expect(validateOutputPath(baseDir, 'OUTPUT')).toBe(join(baseDir, 'OUTPUT'));
    expect(validateOutputPath(baseDir, 'OUTPUT/video/1')).toBe(
      join(baseDir, 'OUTPUT/video/1')
    );
  });

  test('should reject parent directory traversal', () => {
    expect(() => validateOutputPath(baseDir, '../etc/passwd')).toThrow(
      'Path traversal detected'
    );
  });

  test('should reject multiple parent traversals', () => {
    expect(() => validateOutputPath(baseDir, '../../tmp/evil')).toThrow(
      'Path traversal detected'
    );
  });

  test('should reject hidden parent traversal', () => {
    expect(() => validateOutputPath(baseDir, 'OUTPUT/../../tmp')).toThrow(
      'Path traversal detected'
    );
  });

  test('should allow absolute paths within base', () => {
    const absPath = join(baseDir, 'OUTPUT/nested');
    expect(validateOutputPath(baseDir, absPath)).toBe(absPath);
  });

  test('should reject absolute paths outside base', () => {
    expect(() => validateOutputPath(baseDir, '/tmp/evil')).toThrow(
      'Path traversal detected'
    );
  });
});
