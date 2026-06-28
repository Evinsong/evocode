import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Skill, SkillSource } from '../../shared/types';

/** Row structure from the skills table */
interface SkillRow {
  id: string;
  name: string;
  description: string;
  pattern: string;
  usage_count: number;
  source: string;
  definition: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * Convert a database row to a Skill object.
 */
function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pattern: row.pattern,
    usageCount: row.usage_count,
    source: row.source as SkillSource,
    definition: row.definition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SkillManager provides CRUD operations for skills.
 * Skills represent reusable patterns that agents can learn and apply.
 * Uses soft-delete (sets deleted_at timestamp).
 * P1 feature: autoCreate() is reserved for future automatic skill generation.
 */
export class SkillManager {
  constructor(private db: Database.Database) {}

  /**
   * Save a new skill.
   * @param skill - Skill data without id, createdAt, updatedAt
   * @returns The created Skill object with generated id and timestamps
   */
  save(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const id = randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO skills (id, name, description, pattern, usage_count, source, definition, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(
        id,
        skill.name,
        skill.description,
        skill.pattern,
        skill.usageCount,
        skill.source,
        skill.definition,
        now,
        now,
      );

    return {
      id,
      name: skill.name,
      description: skill.description,
      pattern: skill.pattern,
      usageCount: skill.usageCount,
      source: skill.source,
      definition: skill.definition,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get a skill by its ID.
   * @param id - Skill UUID
   * @returns Skill object or null if not found or soft-deleted
   */
  get(id: string): Skill | null {
    const row = this.db
      .prepare('SELECT * FROM skills WHERE id = ? AND deleted_at IS NULL')
      .get(id) as SkillRow | undefined;

    return row ? rowToSkill(row) : null;
  }

  /**
   * List all non-deleted skills.
   * @returns Array of all Skill objects
   */
  list(): Skill[] {
    const rows = this.db
      .prepare('SELECT * FROM skills WHERE deleted_at IS NULL ORDER BY updated_at DESC')
      .all() as SkillRow[];

    return rows.map(rowToSkill);
  }

  /**
   * Search skills by keyword across name, description, and pattern fields.
   * @param query - Search query string
   * @returns Array of matching Skill objects
   */
  search(query: string): Skill[] {
    const pattern = `%${query}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM skills
         WHERE deleted_at IS NULL AND (name LIKE ? OR description LIKE ? OR pattern LIKE ?)
         ORDER BY usage_count DESC, updated_at DESC`,
      )
      .all(pattern, pattern, pattern) as SkillRow[];

    return rows.map(rowToSkill);
  }

  /**
   * Update a skill with partial data.
   * @param id - Skill UUID
   * @param partial - Partial skill data to update
   * @returns Updated Skill object or null if not found
   */
  update(id: string, partial: Partial<Skill>): Skill | null {
    const existing = this.get(id);
    if (!existing) return null;

    const now = Date.now();
    const updated: Skill = {
      ...existing,
      ...partial,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    this.db
      .prepare(
        `UPDATE skills
         SET name = ?, description = ?, pattern = ?, usage_count = ?, source = ?, definition = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(
        updated.name,
        updated.description,
        updated.pattern,
        updated.usageCount,
        updated.source,
        updated.definition,
        now,
        id,
      );

    return updated;
  }

  /**
   * Soft-delete a skill by setting deleted_at timestamp.
   * @param id - Skill UUID
   */
  delete(id: string): void {
    const now = Date.now();
    this.db
      .prepare('UPDATE skills SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL')
      .run(now, id);
  }

  /**
   * Automatically create a skill from observed patterns.
   * P1 feature — not implemented in MVP.
   * @throws Error with 'NotImplemented' prefix
   */
  async autoCreate(): Promise<Skill> {
    throw new Error('NotImplemented: P1 feature — autoCreate is not available in MVP');
  }
}
