import { hammingDistance } from './hamming.js';
import type { Frame, DedupeCluster } from '../types.js';
import { logger } from '../../utils/logger.js';

export function deduplicateFrames(
  frames: Frame[],
  threshold: number
): DedupeCluster[] {
  const clusters: DedupeCluster[] = [];

  // Greedy clustering in timestamp order (frames should already be sorted)
  for (const frame of frames) {
    let addedToCluster = false;

    // Try to add to existing cluster
    for (const cluster of clusters) {
      const canonicalFrame = frames.find(f => f.id === cluster.canonicalFrameId);
      if (!canonicalFrame) continue;

      const distance = hammingDistance(frame.hash, canonicalFrame.hash);

      if (distance <= threshold) {
        cluster.members.push(frame.id);
        cluster.maxDistance = Math.max(cluster.maxDistance, distance);
        addedToCluster = true;
        logger.verbose(`Added ${frame.id} to cluster ${cluster.canonicalFrameId} (distance=${distance})`);
        break;
      }
    }

    // Create new cluster if no match
    if (!addedToCluster) {
      frame.isCanonical = true;
      clusters.push({
        canonicalFrameId: frame.id,
        members: [frame.id],
        maxDistance: 0
      });
      logger.verbose(`Created new cluster with canonical ${frame.id}`);
    }
  }

  return clusters;
}
