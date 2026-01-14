import { execa } from 'execa';
import { logger, setVerbose } from '../../src/utils/logger.js';

export async function generateFixtureVideo(outputPath: string): Promise<void> {
  setVerbose(true);
  logger.info('Generating test fixture video...');

  // Generate simple test video with solid color segments
  // This creates a video with freeze-like patterns: blue (10s), red (10s), blue again (10s)
  // The blue segments should be detected as similar and deduplicated
  await execa('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=320x240:d=10',
    '-f', 'lavfi',
    '-i', 'color=c=red:s=320x240:d=10',
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=320x240:d=10',
    '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1[out]',
    '-map', '[out]',
    '-y',
    outputPath
  ]);

  logger.info(`Generated fixture: ${outputPath}`);
}
