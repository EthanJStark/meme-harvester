import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('gitignore configuration', () => {
  it('should include OUTPUT/ directory', () => {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('OUTPUT/');
  });
});
