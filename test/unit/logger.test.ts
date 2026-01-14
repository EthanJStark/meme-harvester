import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setVerbose } from '../../src/utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setVerbose(false);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log info message', () => {
    logger.info('test message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'test message');
  });

  it('should log error message', () => {
    logger.error('error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error message');
  });

  it('should not log verbose when verbose=false', () => {
    setVerbose(false);
    logger.verbose('verbose message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should log verbose when verbose=true', () => {
    setVerbose(true);
    logger.verbose('verbose message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[VERBOSE]', 'verbose message');
  });
});
