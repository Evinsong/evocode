/**
 * Database schema definition for EvoCode.
 * Contains all CREATE TABLE IF NOT EXISTS statements and indexes.
 * Executed during database initialization.
 */
export const SCHEMA_SQL = `
-- Memories table: persistent memory store (user preferences, project context, historical decisions)
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Skills table: reusable skill definitions (auto-created or manually added)
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  pattern TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  definition TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Audit logs table: append-only audit trail for all agent actions and human interventions
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  agent_id TEXT,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  timestamp INTEGER NOT NULL
);

-- Generated files table: stores AI-generated code files
CREATE TABLE IF NOT EXISTS generated_files (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  framework TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Settings table: simple key-value store for application settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_generated_files_task_id ON generated_files(task_id);
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skills_deleted_at ON skills(deleted_at);
`;
