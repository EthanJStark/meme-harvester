/**
 * Represents a detected freeze interval from freezedetect
 */
export interface FreezeInterval {
  id: string;
  startSec: number;
  endSec: number | null; // null if freeze extends to EOF
  durationSec: number;
}

/**
 * Classification result for a single frame
 */
export interface ClassificationResult {
  path: string;
  label: 'keep' | 'exclude';
  confidence: number;
}

/**
 * Classification data in frame report
 */
export interface Classification {
  label: 'keep' | 'exclude';
  confidence: number;
}

/**
 * Represents an extracted frame from a freeze interval
 */
export interface Frame {
  id: string;
  intervalId: string;
  timestampSec: number;
  file: string; // relative path from output dir
  hash: string;
  hashAlgo: string;
  hashBits: number;
  isCanonical: boolean;
  classification?: Classification | null;
}

/**
 * Represents a cluster of similar frames (dedupe group)
 */
export interface DedupeCluster {
  canonicalFrameId: string;
  members: string[]; // frame IDs
  maxDistance: number; // max Hamming distance in cluster
}

/**
 * Per-input video processing result
 */
export interface InputResult {
  path: string;
  sourceUrl?: string; // URL origin if downloaded
  scanNumber: number;
  durationSec: number;
  videoStream: string;
  freezeDetect: {
    noise: string;
    minDurationSec: number;
  };
  intervals: FreezeInterval[];
  frames: Frame[];
  dedupe: {
    clusters: DedupeCluster[];
  };
}

/**
 * Full report structure (v1 schema)
 */
export interface Report {
  version: string;
  generatedAt: string;
  inputs: InputResult[];
}

/**
 * Information about a YouTube channel
 */
export interface ChannelInfo {
  channelName: string;
  channelUrl: string;
  videos: Array<{ url: string; title: string }>;
}

/**
 * Result of processing an entire channel
 */
export interface ChannelResult {
  channelInfo: ChannelInfo;
  results: InputResult[];
  errors: Array<{ url: string; title: string; error: string }>;
}

/**
 * CLI configuration options
 */
export interface Config {
  inputs?: string[]; // Optional in channel mode
  channelUrl?: string; // Channel mode
  concurrency: number; // Parallel processing limit
  channelTimeout: number; // Channel discovery timeout (ms)
  maxVideos?: number; // Limit channel processing (testing only)
  output: string;
  minFreeze: number;
  noise: string;
  format: 'jpg' | 'png';
  hash: 'phash';
  hashDistance: number;
  keepDuplicates: boolean;
  json: string;
  verbose: boolean;
  classify: boolean;
}
