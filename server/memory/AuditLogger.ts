import type { BetterSqlite3Compat } from '../db/compat';
import { randomUUID } from 'node:crypto';
import type { AuditLog, AuditEventType, AuditFilter } from '../../shared/types';
import { saveDatabase } from '../db/database';

/** Row structure from the audit_logs table */
interface AuditLogRow {
  id: string;
  task_id: string;
  agent_id: string | null;
  event_type: string;
  description: string;
  details: string;
  timestamp: number;
}

/**
 * Convert a database row to an AuditLog object.
 * Parses the JSON details field back to an object.
 */
function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    eventType: row.event_type as AuditEventType,
    description: row.description,
    details: JSON.parse(row.details) as Record<string, unknown>,
    timestamp: row.timestamp,
  };
}

/**
 * AuditLogger provides append-only audit trail logging.
 * All agent actions and human interventions are recorded for traceability.
 * Records are never deleted (no soft-delete for audit logs).
 */
export class AuditLogger {
  constructor(private db: BetterSqlite3Compat) {}

  /**
   * Log an audit event.
   * @param entry - Audit log data without id and timestamp
   * @returns The created AuditLog object with generated id and timestamp
   */
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const id = randomUUID();
    const timestamp = Date.now();
    const detailsJson = JSON.stringify(entry.details);

    this.db
      .prepare(
        `INSERT INTO audit_logs (id, task_id, agent_id, event_type, description, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, entry.taskId, entry.agentId, entry.eventType, entry.description, detailsJson, timestamp);

    saveDatabase();

    return {
      id,
      taskId: entry.taskId,
      agentId: entry.agentId,
      eventType: entry.eventType,
      description: entry.description,
      details: entry.details,
      timestamp,
    };
  }

  /**
   * Get all audit logs for a specific task.
   * @param taskId - Task UUID
   * @returns Array of AuditLog objects ordered by timestamp ascending
   */
  getByTask(taskId: string): AuditLog[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs WHERE task_id = ? ORDER BY timestamp ASC')
      .all(taskId) as AuditLogRow[];

    return rows.map(rowToAuditLog);
  }

  /**
   * Get all audit logs for a specific agent.
   * @param agentId - Agent UUID
   * @returns Array of AuditLog objects ordered by timestamp ascending
   */
  getByAgent(agentId: string): AuditLog[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs WHERE agent_id = ? ORDER BY timestamp ASC')
      .all(agentId) as AuditLogRow[];

    return rows.map(rowToAuditLog);
  }

  /**
   * Query audit logs with a dynamic filter.
   * Builds WHERE clause based on provided filter fields.
   * @param filter - Audit filter with optional taskId, agentId, eventType, startTime, endTime
   * @returns Array of matching AuditLog objects ordered by timestamp ascending
   */
  query(filter: AuditFilter): AuditLog[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.taskId !== undefined) {
      conditions.push('task_id = ?');
      params.push(filter.taskId);
    }

    if (filter.agentId !== undefined) {
      conditions.push('agent_id = ?');
      params.push(filter.agentId);
    }

    if (filter.eventType !== undefined) {
      conditions.push('event_type = ?');
      params.push(filter.eventType);
    }

    if (filter.startTime !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(filter.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp ASC`;

    const rows = this.db.prepare(sql).all(...params) as AuditLogRow[];

    return rows.map(rowToAuditLog);
  }
}
