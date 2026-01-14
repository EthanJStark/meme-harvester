#!/usr/bin/env tsx
/**
 * Compare hashing implementations by processing the training set images
 * Usage: tsx compare-hashing.ts
 */

import { computeHash } from './src/lib/hash/phash.js';
import { deduplicateFrames } from './src/lib/hash/dedupe.js';
import { readdir } from 'fs/promises';
import { join } from 'path';

const TRAINING_SET_DIR = '/Users/ethan.stark/dev/misc/media-scan/llm/training-set-1';
const HAMMING_THRESHOLD = 5;

async function main() {
  console.log('Reading training set images...');
  const files = (await readdir(TRAINING_SET_DIR))
    .filter(f => f.endsWith('.jpg'))
    .sort();

  console.log(`Found ${files.length} images`);
  console.log('Computing hashes...');

  const frames = [];
  for (const file of files) {
    const imagePath = join(TRAINING_SET_DIR, file);
    const id = file.replace('.jpg', '');

    try {
      const hashResult = await computeHash(imagePath);
      frames.push({
        id,
        intervalId: 'training_set',
        timestampSec: 0,
        file: file,
        hash: hashResult.hash,
        hashAlgo: hashResult.hashAlgo,
        hashBits: hashResult.hashBits,
        isCanonical: false
      });
      process.stdout.write(`\rProcessed ${frames.length}/${files.length} images`);
    } catch (error) {
      console.error(`\nError hashing ${file}:`, error);
    }
  }

  console.log('\n\nDeduplicating frames...');
  const clusters = deduplicateFrames(frames, HAMMING_THRESHOLD);

  // Convert clusters to map for output
  const clustersMap = new Map<string, string[]>();
  clusters.forEach(cluster => {
    clustersMap.set(cluster.canonicalFrameId, cluster.members);
  });

  console.log(`\nTotal images: ${frames.length}`);
  console.log(`Unique clusters: ${clustersMap.size}`);
  console.log(`\nCluster details:`);

  const sortedClusters = Array.from(clustersMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [canonical, members] of sortedClusters) {
    if (members.length > 1) {
      console.log(`  ${canonical}: [${members.join(', ')}]`);
    }
  }

  console.log(`\nSingleton clusters: ${Array.from(clustersMap.values()).filter(c => c.length === 1).length}`);
  console.log(`Multi-member clusters: ${Array.from(clustersMap.values()).filter(c => c.length > 1).length}`);

  // Output JSON for comparison
  const output = {
    implementation: 'imghash',
    totalImages: frames.length,
    uniqueClusters: clustersMap.size,
    hamming_threshold: HAMMING_THRESHOLD,
    clusters: Object.fromEntries(sortedClusters)
  };

  console.log('\n\nJSON Output:');
  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
