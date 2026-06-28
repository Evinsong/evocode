import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (config.logLevel as LogLevel) || 'debug';

/**
 * Check if a log level should be output based on the current threshold.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format a log message with timestamp, level, and module name.
 * @param level - Log severity level
 * @param module - Source module name
 * @param message - Log message text
 * @returns Formatted log string
 */
function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
}

/**
 * Logger utility with leveled output (debug/info/warn/error).
 * All output goes to console with consistent formatting.
 */
export const logger = {
  debug(module: string, message: string): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', module, message));
    }
  },

  info(module: string, message: string): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', module, message));
    }
  },

  warn(module: string, message: string): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', module, message));
    }
  },

  error(module: string, message: string): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', module, message));
    }
  },
};

/**
 * Mask a secret string, showing only the first 4 and last 4 characters.
 * Used to safely log API keys, tokens, and other sensitive values.
 * @param str - The secret string to mask
 * @returns Masked string with middle characters replaced by asterisks
 */
export function maskSecret(str: string): string {
  if (!str) return '';
  if (str.length <= 8) {
    return '*'.repeat(str.length);
  }
  const prefix = str.substring(0, 4);
  const suffix = str.substring(str.length - 4);
  return `${prefix}****${suffix}`;
}
