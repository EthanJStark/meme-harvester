import { hash as sharpPhash } from 'sharp-phash';
import { logger } from '../../utils/logger.js';

export interface HashResult {
  hash: string;
  hashAlgo: string;
  hashBits: number;
}

export async function computeHash(imagePath: string): Promise<HashResult> {
  logger.verbose(`Computing pHash for ${imagePath}`);

  const hash = await sharpPhash(imagePath);

  return {
    hash,
    hashAlgo: 'phash',
    hashBits: 64
  };
}
