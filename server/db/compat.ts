/**
 * Compatibility layer that wraps a sql.js Database to provide
 * better-sqlite3-style `prepare().run()/get()/all()` API.
 *
 * This allows the rest of the codebase (MemoryStore, AuditLogger,
 * SkillManager, CodeGenerator, etc.) to keep using the familiar
 * better-sqlite3 call patterns while the actual engine is sql.js.
 */
import type { Database as SqlJsDatabase } from 'sql.js';

// ---------- Prepared statement shim ----------

class PreparedStmt {
  constructor(
    private db: SqlJsDatabase,
    private sql: string,
  ) {}

  /** Execute with positional params and return { changes } (better-sqlite3 compat) */
  run(...params: unknown[]): { changes: number } {
    // sql.js .run() returns undefined; we wrap to match better-sqlite3 shape
    this.db.run(this.sql, params as []);
    return { changes: this.db.getRowsModified() };
  }

  /** Return first matching row as a plain object, or undefined */
  get(...params: unknown[]): Record<string, unknown> | undefined {
    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) stmt.bind(params as []);
      if (stmt.step()) {
        return stmt.getAsObject() as Record<string, unknown>;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  /** Return all matching rows as plain objects */
  all(...params: unknown[]): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) stmt.bind(params as []);
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }
}

// ---------- Wrapped database ----------

/**
 * Proxy wrapper that intercepts `db.prepare(sql)` and returns a
 * better-sqlite3-compatible PreparedStmt instead of sql.js's own statement.
 *
 * All other property accesses (db.run, db.exec, db.getRowsModified, etc.)
 * fall through to the underlying sql.js Database unchanged.
 */
export type BetterSqlite3Compat = SqlJsDatabase & {
  prepare(sql: string): PreparedStmt;
};

export function wrapSqlJs(db: SqlJsDatabase): BetterSqlite3Compat {
  // We create a thin proxy so that `db.prepare()` returns our shim,
  // but everything else (db.run, db.exec, etc.) goes to sql.js directly.
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'prepare') {
        return (sql: string) => new PreparedStmt(target, sql);
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as unknown as BetterSqlite3Compat;
}
