import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database';
import { SkillManager } from '../memory/SkillManager';
import type { ApiResponse, Skill, SkillSource } from '../../shared/types';

const router = Router();

/**
 * Get a SkillManager instance using the singleton database connection.
 */
function getSkillManager(): SkillManager {
  return new SkillManager(getDb());
}

/**
 * GET /api/skills
 * List all skills, or search by keyword if ?q= is provided.
 * Query params: ?q=<search keyword>
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const manager = getSkillManager();
    const { q } = req.query;

    let skills: Skill[];

    if (q && typeof q === 'string' && q.length > 0) {
      skills = manager.search(q);
    } else {
      skills = manager.list();
    }

    const response: ApiResponse<Skill[]> = { code: 0, data: skills, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/skills/:id
 * Get a single skill by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const manager = getSkillManager();
    const skill = manager.get(req.params.id);

    if (!skill) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Skill not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Skill> = { code: 0, data: skill, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * POST /api/skills
 * Create a new skill.
 * Body: { name, description, pattern, usageCount, source, definition }
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const manager = getSkillManager();
    const { name, description, pattern, usageCount, source, definition } = req.body;

    // Validate required fields
    if (!name || !description || !pattern || !definition) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required fields: name, description, pattern, definition',
      };
      res.status(400).json(response);
      return;
    }

    const skill = manager.save({
      name: String(name),
      description: String(description),
      pattern: String(pattern),
      usageCount: typeof usageCount === 'number' ? usageCount : 0,
      source: (source as SkillSource) ?? 'manual',
      definition: String(definition),
    });

    const response: ApiResponse<Skill> = { code: 0, data: skill, message: 'success' };
    res.status(201).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/skills/:id
 * Update an existing skill.
 * Body: partial Skill fields to update
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const manager = getSkillManager();
    const skill = manager.update(req.params.id, req.body);

    if (!skill) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Skill not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Skill> = { code: 0, data: skill, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/skills/:id
 * Soft-delete a skill.
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const manager = getSkillManager();
    manager.delete(req.params.id);

    const response: ApiResponse<null> = { code: 0, data: null, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

export default router;
