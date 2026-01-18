import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import type { ClassificationResult, Frame } from '../types.js';

// Re-export for convenience
export type { ClassificationResult } from '../types.js';

/**
 * Find Python interpreter (prefer venv, fallback to system python3)
 */
function findPythonInterpreter(): string {
  const venvPath = 'python/venv/bin/python';
  if (existsSync(venvPath)) {
    logger.verbose(`Using Python from venv: ${venvPath}`);
    return venvPath;
  }

  logger.verbose('Using system python3');
  return 'python3';
}

/**
 * Check if classifier model exists
 */
function checkModelExists(): boolean {
  return existsSync('models/classifier.pkl');
}

/**
 * Classify a batch of images using Python subprocess
 *
 * @param imageDir - Directory containing images to classify
 * @returns Map of image path to classification result
 */
export async function classifyBatch(
  imageDir: string
): Promise<Map<string, ClassificationResult>> {
  // Check if model exists
  if (!checkModelExists()) {
    logger.info('Classifier model not found at models/classifier.pkl');
    logger.info('Skipping classification. Run python/train_classifier.py to create model.');
    return new Map();
  }

  const pythonPath = findPythonInterpreter();
  const scriptPath = 'python/classify_images.py';

  if (!existsSync(scriptPath)) {
    logger.info(`Classification script not found: ${scriptPath}`);
    return new Map();
  }

  try {
    logger.verbose(`Running classification on ${imageDir}...`);

    const { stdout, stderr } = await execa(pythonPath, [scriptPath, imageDir], {
      timeout: 300000  // 5 minute timeout for large batches
    });

    if (stderr) {
      logger.verbose(`Python stderr: ${stderr}`);
    }

    // Parse JSON output
    const results: ClassificationResult[] = JSON.parse(stdout);

    // Convert to Map for easy lookup
    const resultMap = new Map<string, ClassificationResult>();
    for (const result of results) {
      resultMap.set(result.path, result);
    }

    logger.info(`Classified ${resultMap.size} images`);
    return resultMap;

  } catch (error) {
    if (error && typeof error === 'object' && 'exitCode' in error) {
      const exitCode = (error as { exitCode: number }).exitCode;
      if (exitCode === 1) {
        logger.error('Classification failed: Model file error');
      } else if (exitCode === 2) {
        logger.error('Classification failed: Python dependency error');
      }
    }

    logger.info('Classification failed, continuing without classification data');
    logger.verbose(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return new Map();
  }
}

/**
 * Classify frames for a single video
 *
 * @param outputDir - Output directory for the video
 * @param frames - Frames to classify
 * @returns Map of frame path to classification result
 */
export async function classifyFrames(
  outputDir: string,
  frames: Frame[]
): Promise<Map<string, ClassificationResult>> {
  return classifyBatch(outputDir);
}
