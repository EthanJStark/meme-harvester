// scripts/build-bundles.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Setup build directory structure
 * @param {string} buildRoot - Root build directory path
 * @returns {Promise<Object>} Directory paths object
 */
export async function setupDirectories(buildRoot = path.join(projectRoot, 'build')) {
  const dirs = {
    root: buildRoot,
    downloads: path.join(buildRoot, 'downloads'),
    tempDeps: path.join(buildRoot, 'temp-deps'),
    bundles: path.join(buildRoot, 'bundles'),
  };

  // Create all directories
  for (const dir of Object.values(dirs)) {
    await fs.mkdir(dir, { recursive: true });
  }

  return dirs;
}
