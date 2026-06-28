import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database';
import { MemoryStore } from '../memory/MemoryStore';
import type { ApiResponse, Memory, MemoryType } from '../../shared/types';

const router = Router();

/**
 * Get a MemoryStore instance using the singleton database connection.
 */
function getMemoryStore(): MemoryStore {
  return new MemoryStore(getDb());
}

/**
 * GET /api/memories
 * List memories with optional filtering by type or keyword search.
 * Query params: ?type=<MemoryType> and ?q=<search keyword>
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const store = getMemoryStore();
    const { type, q } = req.query;

    let memories: Memory[];

    if (q && typeof q === 'string' && q.length > 0) {
      memories = store.search(q);
    } else if (type && typeof type === 'string') {
      memories = store.findByType(type as MemoryType);
    } else {
      // Return all non-deleted memories by searching with empty pattern
      // Using a broad query to list all
      memories = store.findByType('user_preference')
        .concat(store.findByType('project_context'))
        .concat(store.findByType('historical_decision'));
    }

    const response: ApiResponse<Memory[]> = {
      code: 0,
      data: memories,
      message: 'success',
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/memories/:id
 * Get a single memory by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const store = getMemoryStore();
    const memory = store.get(req.params.id);

    if (!memory) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Memory not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Memory> = { code: 0, data: memory, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * POST /api/memories
 * Create a new memory.
 * Body: { type, key, value, metadata }
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const store = getMemoryStore();
    const { type, key, value, metadata } = req.body;

    // Validate required fields
    if (!type || !key || value === undefined) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required fields: type, key, value',
      };
      res.status(400).json(response);
      return;
    }

    const memory = store.save({
      type: type as MemoryType,
      key: String(key),
      value: String(value),
      metadata: metadata ?? {},
    });

    const response: ApiResponse<Memory> = { code: 0, data: memory, message: 'success' };
    res.status(201).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/memories/:id
 * Update an existing memory.
 * Body: partial Memory fields to update
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const store = getMemoryStore();
    const memory = store.update(req.params.id, req.body);

    if (!memory) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Memory not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Memory> = { code: 0, data: memory, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/memories/:id
 * Soft-delete a memory.
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const store = getMemoryStore();
    store.delete(req.params.id);

    const response: ApiResponse<null> = { code: 0, data: null, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

export default router;
