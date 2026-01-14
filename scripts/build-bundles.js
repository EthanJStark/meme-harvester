// scripts/build-bundles.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { extract as tarExtract } from 'tar';
import archiver from 'archiver';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Node 24 LTS - Check https://nodejs.org/en/about/previous-releases
// Update quarterly or when security patches released
const NODE_VERSION = '24.13.0'; // Updated Jan 2026

const PLATFORMS = {
  'macos-arm64': {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    archiveExt: 'tar.gz',
    nodeBinaryPath: 'bin/node', // Path within extracted archive
  },
  'macos-x64': {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    archiveExt: 'tar.gz',
    nodeBinaryPath: 'bin/node',
  },
  'linux-x64': {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz`,
    archiveExt: 'tar.gz',
    nodeBinaryPath: 'bin/node',
  },
  'win-x64': {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    archiveExt: 'zip',
    nodeBinaryPath: 'node.exe', // Path within extracted archive
  },
};

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

/**
 * Download Node binary for platform with caching
 * @param {string} platform - Platform identifier (e.g., 'macos-arm64')
 * @param {Object} config - Platform configuration
 * @param {string} downloadsDir - Downloads directory path
 * @returns {Promise<string>} Path to Node binary
 */
export async function downloadNodeBinary(platform, config, downloadsDir) {
  const binaryPath = path.join(downloadsDir, `node-${platform}`);

  // Check cache
  try {
    await fs.access(binaryPath);
    console.log(`✓ Using cached Node binary: ${platform}`);
    return binaryPath;
  } catch {
    // Not cached, download
  }

  console.log(`⬇ Downloading Node ${NODE_VERSION} for ${platform}...`);

  const archivePath = path.join(downloadsDir, `node-${platform}.${config.archiveExt}`);

  // Download archive
  const response = await fetch(config.nodeUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Node binary: ${response.statusText}`);
  }

  // Save archive
  await pipeline(
    response.body,
    createWriteStream(archivePath)
  );

  // Extract Node binary
  if (config.archiveExt === 'tar.gz') {
    // Extract from tar.gz
    const archiveName = `node-v${NODE_VERSION}-${platform === 'macos-arm64' ? 'darwin-arm64' : platform === 'macos-x64' ? 'darwin-x64' : 'linux-x64'}`;
    await tarExtract({
      file: archivePath,
      cwd: downloadsDir,
      filter: (filePath) => filePath.endsWith(config.nodeBinaryPath),
    });

    // Move binary to final location
    const extractedPath = path.join(downloadsDir, archiveName, config.nodeBinaryPath);
    await fs.rename(extractedPath, binaryPath);

    // Cleanup
    await fs.rm(path.join(downloadsDir, archiveName), { recursive: true, force: true });
  } else {
    // Handle .zip for Windows
    const archiveName = `node-v${NODE_VERSION}-win-x64`;
    const zip = new AdmZip(archivePath);
    const zipEntries = zip.getEntries();

    // Find node.exe in the zip
    const nodeEntry = zipEntries.find(entry =>
      entry.entryName.endsWith(config.nodeBinaryPath)
    );

    if (!nodeEntry) {
      throw new Error(`node.exe not found in ${archivePath}`);
    }

    // Extract node.exe to final location
    await fs.writeFile(binaryPath, nodeEntry.getData());
  }

  // Make executable (Unix)
  if (platform !== 'win-x64') {
    await fs.chmod(binaryPath, 0o755);
  }

  // Remove archive
  await fs.rm(archivePath);

  console.log(`✓ Downloaded Node binary: ${platform}`);
  return binaryPath;
}

/**
 * Assemble bundle for a platform
 * @param {string} platform - Platform identifier
 * @param {string} nodeBinaryPath - Path to Node binary
 * @param {string} bundlesDir - Bundles output directory
 * @returns {Promise<string>} Path to bundle directory
 */
export async function assembleBundle(platform, nodeBinaryPath, bundlesDir) {
  const bundleName = `harvest-${platform}`;
  const bundleDir = path.join(bundlesDir, bundleName);

  console.log(`📦 Assembling bundle: ${platform}`);

  // Create bundle directory structure
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.mkdir(path.join(bundleDir, 'bin'), { recursive: true });

  // Copy Node binary
  const targetNodePath = platform === 'win-x64'
    ? path.join(bundleDir, 'bin', 'node.exe')
    : path.join(bundleDir, 'bin', 'node');
  await fs.copyFile(nodeBinaryPath, targetNodePath);

  // Make executable on Unix
  if (platform !== 'win-x64') {
    await fs.chmod(targetNodePath, 0o755);
  }

  // Copy compiled TypeScript (dist/)
  const distSource = path.join(projectRoot, 'dist');
  const distTarget = path.join(bundleDir, 'dist');
  await copyDirectory(distSource, distTarget);

  // Copy production dependencies (node_modules/)
  // NOTE: Must run on target platform to get correct Sharp binaries
  const nodeModulesSource = path.join(projectRoot, 'node_modules');
  const nodeModulesTarget = path.join(bundleDir, 'node_modules');
  await copyDirectory(nodeModulesSource, nodeModulesTarget);

  // Copy package.json
  await fs.copyFile(
    path.join(projectRoot, 'package.json'),
    path.join(bundleDir, 'package.json')
  );

  // Copy launcher script
  const launcherTemplate = platform === 'win-x64'
    ? path.join(projectRoot, 'scripts', 'templates', 'harvest.bat')
    : path.join(projectRoot, 'scripts', 'templates', 'harvest.sh');
  const launcherTarget = platform === 'win-x64'
    ? path.join(bundleDir, 'harvest.bat')
    : path.join(bundleDir, 'harvest');

  await fs.copyFile(launcherTemplate, launcherTarget);

  // Make launcher executable on Unix
  if (platform !== 'win-x64') {
    await fs.chmod(launcherTarget, 0o755);
  }

  console.log(`✓ Bundle assembled: ${bundleName}`);
  return bundleDir;
}

/**
 * Recursively copy directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Create compressed archive for bundle
 * @param {string} platform - Platform identifier
 * @param {string} bundleDir - Bundle directory path
 * @param {string} bundlesDir - Bundles output directory
 * @returns {Promise<string>} Path to archive file
 */
export async function createArchive(platform, bundleDir, bundlesDir) {
  const bundleName = path.basename(bundleDir);
  const isWindows = platform === 'win-x64';
  const ext = isWindows ? 'zip' : 'tar.gz';
  const archivePath = path.join(bundlesDir, `${bundleName}.${ext}`);

  console.log(`📦 Creating archive: ${bundleName}.${ext}`);

  const output = createWriteStream(archivePath);
  const archive = archiver(isWindows ? 'zip' : 'tar', {
    gzip: !isWindows,
    gzipOptions: { level: 9 },
  });

  // Handle errors
  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive to file
  archive.pipe(output);

  // Add bundle directory to archive
  archive.directory(bundleDir, bundleName);

  // Finalize archive
  await archive.finalize();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
  });

  const sizeKB = ((await fs.stat(archivePath)).size / 1024).toFixed(0);
  console.log(`✓ Archive created: ${bundleName}.${ext} (${sizeKB} KB)`);

  return archivePath;
}

/**
 * Generate SHA256 checksums for all archives
 * @param {string[]} archivePaths - Array of archive file paths
 * @param {string} bundlesDir - Bundles output directory
 * @returns {Promise<string>} Path to checksums file
 */
export async function generateChecksums(archivePaths, bundlesDir) {
  console.log('🔐 Generating checksums...');

  const checksums = [];

  for (const archivePath of archivePaths) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(archivePath);
    hash.update(fileBuffer);
    const checksum = hash.digest('hex');
    const filename = path.basename(archivePath);
    checksums.push(`${checksum}  ${filename}`);
  }

  const checksumsPath = path.join(bundlesDir, 'checksums.txt');
  await fs.writeFile(checksumsPath, checksums.join('\n') + '\n');

  console.log(`✓ Checksums generated: checksums.txt`);
  return checksumsPath;
}

/**
 * Main build orchestration
 * @param {Object} options - Build options
 * @param {string} [options.platform] - Build specific platform only
 */
async function main(options = {}) {
  console.log('🚀 Starting bundle build process\n');

  const startTime = Date.now();

  // Setup directories
  const dirs = await setupDirectories();
  console.log('');

  // Determine platforms to build
  const platformsToBuild = options.platform
    ? [options.platform]
    : Object.keys(PLATFORMS);

  // Verify TypeScript is compiled
  try {
    await fs.access(path.join(projectRoot, 'dist', 'cli.js'));
  } catch {
    console.error('❌ Error: dist/ not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Verify production dependencies installed
  try {
    await fs.access(path.join(projectRoot, 'node_modules', 'sharp'));
  } catch {
    console.error('❌ Error: node_modules/ not found. Run "npm ci --production" first.');
    process.exit(1);
  }

  const archivePaths = [];

  // Build each platform
  for (const platform of platformsToBuild) {
    console.log('');
    const config = PLATFORMS[platform];

    // Download Node binary
    const nodeBinary = await downloadNodeBinary(platform, config, dirs.downloads);

    // Assemble bundle
    const bundleDir = await assembleBundle(platform, nodeBinary, dirs.bundles);

    // Create archive
    const archivePath = await createArchive(platform, bundleDir, dirs.bundles);
    archivePaths.push(archivePath);
  }

  console.log('');

  // Generate checksums
  await generateChecksums(archivePaths, dirs.bundles);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Build complete in ${duration}s`);
  console.log(`📦 Bundles: ${dirs.bundles}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--platform' && args[i + 1]) {
    options.platform = args[i + 1];
    i++;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main(options).catch((err) => {
    console.error('\n❌ Build failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

// Export PLATFORMS for testing
export { PLATFORMS };
