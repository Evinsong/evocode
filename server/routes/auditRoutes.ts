import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database';
import { AuditLogger } from '../memory/AuditLogger';
import type { ApiResponse, AuditEventType, AuditFilter, AuditLog } from '../../shared/types';

const router = Router();

/**
 * Get an AuditLogger instance using the singleton database connection.
 */
function getAuditLogger(): AuditLogger {
  return new AuditLogger(getDb());
}

/**
 * GET /api/audit
 * Query audit logs with optional filters.
 * Query params: ?taskId=, ?agentId=, ?eventType=, ?startTime=, ?endTime=
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const logger = getAuditLogger();
    const { taskId, agentId, eventType, startTime, endTime } = req.query;

    const filter: AuditFilter = {};

    if (taskId && typeof taskId === 'string') {
      filter.taskId = taskId;
    }

    if (agentId && typeof agentId === 'string') {
      filter.agentId = agentId;
    }

    if (eventType && typeof eventType === 'string') {
      filter.eventType = eventType as AuditEventType;
    }

    if (startTime && typeof startTime === 'string') {
      const parsed = parseInt(startTime, 10);
      if (!isNaN(parsed)) filter.startTime = parsed;
    }

    if (endTime && typeof endTime === 'string') {
      const parsed = parseInt(endTime, 10);
      if (!isNaN(parsed)) filter.endTime = parsed;
    }

    const logs = logger.query(filter);

    const response: ApiResponse<AuditLog[]> = { code: 0, data: logs, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/audit/task/:taskId
 * Get all audit logs for a specific task.
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  try {
    const logger = getAuditLogger();
    const logs = logger.getByTask(req.params.taskId);

    const response: ApiResponse<AuditLog[]> = { code: 0, data: logs, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/audit/agent/:agentId
 * Get all audit logs for a specific agent.
 */
router.get('/agent/:agentId', (req: Request, res: Response) => {
  try {
    const logger = getAuditLogger();
    const logs = logger.getByAgent(req.params.agentId);

    const response: ApiResponse<AuditLog[]> = { code: 0, data: logs, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

export default router;
