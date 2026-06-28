import dotenv from 'dotenv';
import path from 'node:path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Get a string environment variable with a default value.
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set
 * @returns The environment variable value or default
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get a numeric environment variable with a default value.
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set or invalid
 * @returns The parsed number or default
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get a boolean environment variable.
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set
 * @returns The parsed boolean or default
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Application configuration object.
 * Centralized access to all environment-based settings.
 */
export const config = {
  port: getEnvNumber('PORT', 3000),
  encryptionKey: getEnv('ENCRYPTION_KEY', ''),
  isDev: process.env.NODE_ENV !== 'production',
  logLevel: getEnv('LOG_LEVEL', 'debug'),
} as const;
