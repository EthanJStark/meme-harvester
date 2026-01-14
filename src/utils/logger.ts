let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export const logger = {
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  verbose: (...args: any[]) => {
    if (verbose) {
      console.log('[VERBOSE]', ...args);
    }
  }
};
