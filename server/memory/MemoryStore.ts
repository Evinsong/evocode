import type { BetterSqlite3Compat } from '../db/compat';
import { randomUUID } from 'node:crypto';
import type { Memory, MemoryType } from '../../shared/types';
import { saveDatabase } from '../db/database';

/** Row structure from the memories table */
interface MemoryRow {
  id: string;
  type: string;
  key: string;
  value: string;
  metadata: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * Convert a database row to a Memory object.
 * Parses the JSON metadata field back to an object.
 */
function rowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    type: row.type as MemoryType,
    key: row.key,
    value: row.value,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * MemoryStore provides CRUD operations for persistent memories.
 * Memories store user preferences, project context, and historical decisions.
 * Uses soft-delete (sets deleted_at timestamp, queries filter by deleted_at IS NULL).
 */
export class MemoryStore {
  constructor(private db: BetterSqlite3Compat) {}

  /**
   * Save a new memory entry.
   * @param memory - Memory data without id, createdAt, updatedAt
   * @returns The created Memory object with generated id and timestamps
   */
  save(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Memory {
    const id = randomUUID();
    const now = Date.now();
    const metadataJson = JSON.stringify(memory.metadata);

    this.db
      .prepare(
        `INSERT INTO memories (id, type, key, value, metadata, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(id, memory.type, memory.key, memory.value, metadataJson, now, now);

    saveDatabase();

    return {
      id,
      type: memory.type,
      key: memory.key,
      value: memory.value,
      metadata: memory.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get a memory by its ID.
   * @param id - Memory UUID
   * @returns Memory object or null if not found or soft-deleted
   */
  get(id: string): Memory | null {
    const row = this.db
      .prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL')
      .get(id) as MemoryRow | undefined;

    return row ? rowToMemory(row) : null;
  }

  /**
   * Find all non-deleted memories of a given type.
   * @param type - Memory type to filter by
   * @returns Array of Memory objects
   */
  findByType(type: MemoryType): Memory[] {
    const rows = this.db
      .prepare('SELECT * FROM memories WHERE type = ? AND deleted_at IS NULL ORDER BY updated_at DESC')
      .all(type) as MemoryRow[];

    return rows.map(rowToMemory);
  }

  /**
   * Search memories by keyword across key and value fields.
   * @param query - Search query string
   * @returns Array of matching Memory objects
   */
  search(query: string): Memory[] {
    const pattern = `%${query}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM memories
         WHERE deleted_at IS NULL AND (key LIKE ? OR value LIKE ?)
         ORDER BY updated_at DESC`,
      )
      .all(pattern, pattern) as MemoryRow[];

    return rows.map(rowToMemory);
  }

  /**
   * Update a memory with partial data.
   * Only updates provided fields, preserves others.
   * @param id - Memory UUID
   * @param partial - Partial memory data to update
   * @returns Updated Memory object or null if not found
   */
  update(id: string, partial: Partial<Memory>): Memory | null {
    const existing = this.get(id);
    if (!existing) return null;

    const now = Date.now();
    const updated: Memory = {
      ...existing,
      ...partial,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    const metadataJson = JSON.stringify(updated.metadata);
    this.db
      .prepare(
        `UPDATE memories
         SET type = ?, key = ?, value = ?, metadata = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(updated.type, updated.key, updated.value, metadataJson, now, id);

    saveDatabase();
    return updated;
  }

  /**
   * Soft-delete a memory by setting deleted_at timestamp.
   * @param id - Memory UUID
   */
  delete(id: string): void {
    const now = Date.now();
    this.db
      .prepare('UPDATE memories SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL')
      .run(now, id);

    saveDatabase();
  }

  /**
   * Retrieve memories relevant to a given context string.
   * Performs keyword tokenization + LIKE matching across key and value fields.
   * Results are sorted by type priority (user_preference first, then project_context,
   * then historical_decision) and by update time.
   * @param context - Context string to search for relevant memories
   * @returns Array of relevant Memory objects
   */
  retrieveRelevant(context: string): Memory[] {
    // Tokenize the context into keywords (split by whitespace and common delimiters)
    const keywords = context
      .toLowerCase()
      .split(/[\s,，。.;；!！?？:：""''()（）\[\]【】]+/)
      .filter((kw) => kw.length > 1);

    if (keywords.length === 0) {
      // If no meaningful keywords, return recent memories
      return this.findByType('user_preference');
    }

    // Build dynamic LIKE conditions for each keyword
    const conditions = keywords
      .map(() => '(LOWER(key) LIKE ? OR LOWER(value) LIKE ?)')
      .join(' OR ');
    const params: string[] = [];
    for (const kw of keywords) {
      params.push(`%${kw}%`, `%${kw}%`);
    }

    const rows = this.db
      .prepare(
        `SELECT * FROM memories
         WHERE deleted_at IS NULL AND (${conditions})
         ORDER BY
           CASE type
             WHEN 'user_preference' THEN 0
             WHEN 'project_context' THEN 1
             WHEN 'historical_decision' THEN 2
             ELSE 3
           END,
           updated_at DESC`,
      )
      .all(...params) as MemoryRow[];

    return rows.map(rowToMemory);
  }
}
