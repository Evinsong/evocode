import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema';
import { getEnv } from '../lib/config';
import { logger } from '../lib/logger';

/** Singleton database instance */
let dbInstance: SqlJsDatabase | null = null;
let dbPath: string = '';

/**
 * Get the database file path from environment or use default.
 * @returns Path to the SQLite database file
 */
function getDbPath(): string {
  return getEnv('DB_PATH', './data/evocode.db');
}

/**
 * Ensure the parent directory for the database file exists.
 * @param dbPath - Path to the database file
 */
function ensureDataDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Database', `Created data directory: ${dir}`);
  }
}

/**
 * Save the in-memory database to disk.
 */
function saveToDisk(): void {
  if (dbInstance && dbPath) {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    logger.debug('Database', `Saved database to ${dbPath}`);
  }
}

/**
 * Initialize the database connection and run schema migrations.
 * Creates the data directory if needed and executes all CREATE TABLE IF NOT EXISTS statements.
 * Safe to call multiple times — only initializes once.
 */
export async function initDatabase(): Promise<void> {
  if (dbInstance) {
    logger.debug('Database', 'Database already initialized, skipping.');
    return;
  }

  dbPath = getDbPath();
  ensureDataDir(dbPath);

  // Initialize SQL.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
    logger.info('Database', `Loaded existing database from ${dbPath}`);
  } else {
    dbInstance = new SQL.Database();
    logger.info('Database', `Created new database at ${dbPath}`);
  }

  // Execute schema
  dbInstance.run(SCHEMA_SQL);

  // Save after schema creation
  saveToDisk();

  logger.info('Database', `Initialized SQLite at ${dbPath}`);
}

/**
 * Synchronous initialization for backward compatibility.
 * Must be called after async initDatabase completes.
 */
export function initDatabaseSync(): void {
  // This is a no-op now, actual init is async
  logger.debug('Database', 'Database sync init called (actual init is async)');
}

/**
 * Get the singleton database instance.
 * @returns The initialized Database instance
 * @throws Error if database has not been initialized
 */
export function getDb(): SqlJsDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Save database to disk (call after modifications).
 */
export function saveDatabase(): void {
  saveToDisk();
}

/**
 * Close the database connection gracefully.
 * Used during server shutdown.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    saveToDisk();
    dbInstance.close();
    dbInstance = null;
    logger.info('Database', 'Database connection closed.');
  }
}