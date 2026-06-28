import { getDb, saveDatabase } from './database';
import { logger } from '../lib/logger';

/**
 * Migration record stored in the _migrations table.
 * Tracks which migrations have been applied.
 */
interface MigrationRecord {
  id: number;
  name: string;
  applied_at: number;
}

/**
 * A migration definition: a name + up SQL.
 * Down (rollback) SQL is optional and not required for MVP.
 */
export interface Migration {
  name: string;
  up: string;
  down?: string;
}

/**
 * Ensure the _migrations tracking table exists.
 * Called once before running any migrations.
 */
function ensureMigrationsTable(): void {
  const db = getDb();
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);
}

/**
 * Get the set of already-applied migration names.
 */
function getAppliedMigrations(): Set<string> {
  const db = getDb();
  const rows = db.prepare('SELECT name FROM _migrations').all() as MigrationRecord[];
  return new Set(rows.map((r) => r.name));
}

/**
 * Run all pending migrations in order.
 * Each migration is wrapped in a transaction.
 * On success, records the migration name in _migrations and saves to disk.
 *
 * @param migrations - Ordered list of migrations to apply
 * @returns Number of newly applied migrations
 */
export function runMigrations(migrations: Migration[]): number {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const db = getDb();
  let count = 0;

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      logger.debug('Migrations', `Skipping already-applied: ${migration.name}`);
      continue;
    }

    logger.info('Migrations', `Applying: ${migration.name}`);
    db.run('BEGIN TRANSACTION');
    try {
      db.run(migration.up);
      const now = Date.now();
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(migration.name, now);
      db.run('COMMIT');
      saveDatabase();
      count++;
      logger.info('Migrations', `Applied: ${migration.name}`);
    } catch (err) {
      db.run('ROLLBACK');
      logger.error('Migrations', `Failed to apply ${migration.name}: ${err}`);
      throw err;
    }
  }

  if (count > 0) {
    logger.info('Migrations', `Applied ${count} migration(s)`);
  } else {
    logger.debug('Migrations', 'No pending migrations');
  }

  return count;
}
