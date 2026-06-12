
/**
 * Centralized logging utility for Ligature
 * 
 * In production, set NEXT_PUBLIC_LOG_LEVEL=error to suppress debug logs.
 * In development, all logs are shown by default.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('Sync', 'Loading data...');
 *   logger.info('Auth', 'User logged in', { userId: '123' });
 *   logger.warn('API', 'Rate limit approaching');
 *   logger.error('DB', 'Connection failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  if (typeof window !== 'undefined') {
    return (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'debug';
  }
  return (process.env.LOG_LEVEL as LogLevel) || 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getConfiguredLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function formatMessage(module: string, message: string): string {
  return `[${module}] ${message}`;
}

export const logger = {
  debug: (module: string, message: string, data?: unknown) => {
    if (shouldLog('debug')) {
      if (data !== undefined) {
        console.log(formatMessage(module, message), data);
      } else {
        console.log(formatMessage(module, message));
      }
    }
  },

  info: (module: string, message: string, data?: unknown) => {
    if (shouldLog('info')) {
      if (data !== undefined) {
        console.info(formatMessage(module, message), data);
      } else {
        console.info(formatMessage(module, message));
      }
    }
  },

  warn: (module: string, message: string, data?: unknown) => {
    if (shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(formatMessage(module, message), data);
      } else {
        console.warn(formatMessage(module, message));
      }
    }
  },

  error: (module: string, message: string, error?: unknown) => {
    if (shouldLog('error')) {
      if (error !== undefined) {
        console.error(formatMessage(module, message), error);
      } else {
        console.error(formatMessage(module, message));
      }
    }
  },
};

export default logger;
