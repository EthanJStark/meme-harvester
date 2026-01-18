import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hammingDistance } from './hash/hamming.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BlocklistEntry {
  hash: string;
  description: string;
  source: string;
  addedAt?: string;
}

export interface Blocklist {
  version: number;
  entries: BlocklistEntry[];
}

const DEFAULT_BLOCKLIST_PATH = join(__dirname, '../../models/blocklist.json');
const DEFAULT_THRESHOLD = 5; // Hamming distance threshold

/**
 * Load blocklist from file
 * Returns empty blocklist if file doesn't exist
 */
export async function loadBlocklist(
  path: string = DEFAULT_BLOCKLIST_PATH
): Promise<Blocklist> {
  if (!existsSync(path)) {
    logger.verbose(`Blocklist not found at ${path}, using empty blocklist`);
    return { version: 1, entries: [] };
  }

  try {
    const content = await readFile(path, 'utf-8');
    const blocklist = JSON.parse(content) as Blocklist;
    logger.verbose(`Loaded blocklist with ${blocklist.entries.length} entries`);
    return blocklist;
  } catch (error) {
    logger.error(`Failed to load blocklist from ${path}: ${error}`);
    return { version: 1, entries: [] };
  }
}

/**
 * Check if a hash matches any entry in the blocklist
 * Returns the matching entry if found, null otherwise
 */
export function checkBlocklist(
  hash: string,
  blocklist: Blocklist,
  threshold: number = DEFAULT_THRESHOLD
): BlocklistEntry | null {
  for (const entry of blocklist.entries) {
    try {
      const distance = hammingDistance(hash, entry.hash);
      if (distance <= threshold) {
        logger.verbose(
          `Hash matches blocklist entry (distance=${distance}): ${entry.description}`
        );
        return entry;
      }
    } catch (error) {
      logger.error(`Error comparing hash to blocklist entry: ${error}`);
    }
  }

  return null;
}

/**
 * Add a new entry to the blocklist and save to file
 */
export async function addToBlocklist(
  entry: BlocklistEntry,
  path: string = DEFAULT_BLOCKLIST_PATH
): Promise<void> {
  const blocklist = await loadBlocklist(path);

  // Add timestamp if not provided
  if (!entry.addedAt) {
    entry.addedAt = new Date().toISOString();
  }

  // Check if hash already exists
  const existing = blocklist.entries.find(e => e.hash === entry.hash);
  if (existing) {
    logger.info(`Hash ${entry.hash} already exists in blocklist`);
    return;
  }

  blocklist.entries.push(entry);

  try {
    await writeFile(path, JSON.stringify(blocklist, null, 2), 'utf-8');
    logger.info(`Added to blocklist: ${entry.description}`);
  } catch (error) {
    logger.error(`Failed to save blocklist to ${path}: ${error}`);
    throw error;
  }
}
