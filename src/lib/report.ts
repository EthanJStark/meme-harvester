import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { Report, InputResult } from './types.js';
import { logger } from '../utils/logger.js';

export function generateReport(inputs: InputResult[]): Report {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    inputs
  };
}

export async function writeReport(
  report: Report,
  outputPath: string
): Promise<void> {
  logger.info(`Writing report to ${outputPath}`);

  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write pretty JSON
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  logger.info(`Report written: ${outputPath}`);
}
