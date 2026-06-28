import { Router, type Request, type Response } from 'express';
import { getTaskScheduler } from '../services/container';
import type { ApiResponse, InterventionAction, Task, TaskPriority, TaskStep } from '../../shared/types';

const router = Router();

/** Valid values for TaskPriority */
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

/** Valid values for InterventionAction */
const VALID_ACTIONS: InterventionAction[] = ['pause', 'resume', 'modify', 'reject', 'cancel'];

/** Validate that a string is non-empty and of reasonable length */
function validateString(value: unknown, fieldName: string, maxLength: number = 500): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} must be a non-empty string`;
  }
  if (value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  return null;
}

/**
 * POST /api/tasks
 * Create a new task.
 * Body: { title: string, description: string, priority?: TaskPriority }
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;

    // Validate required fields
    const titleError = validateString(title, 'title', 200);
    if (titleError) {
      const response: ApiResponse<null> = { code: 400, data: null, message: titleError };
      res.status(400).json(response);
      return;
    }
    const descError = validateString(description, 'description', 5000);
    if (descError) {
      const response: ApiResponse<null> = { code: 400, data: null, message: descError };
      res.status(400).json(response);
      return;
    }

    // Validate priority if provided
    let validatedPriority: TaskPriority | undefined;
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        const response: ApiResponse<null> = {
          code: 400,
          data: null,
          message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        };
        res.status(400).json(response);
        return;
      }
      validatedPriority = priority;
    }

    const scheduler = getTaskScheduler();
    const task = scheduler.createTask(
      String(title).trim(),
      String(description).trim(),
      validatedPriority,
    );

    const response: ApiResponse<Task> = { code: 0, data: task, message: 'success' };
    res.status(201).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/tasks
 * Get all tasks.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const scheduler = getTaskScheduler();
    const tasks = scheduler.getAllTasks();

    const response: ApiResponse<Task[]> = { code: 0, data: tasks, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const scheduler = getTaskScheduler();
    const task = scheduler.getTask(req.params.id);

    if (!task) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Task not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Task> = { code: 0, data: task, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * POST /api/tasks/:id/start
 * Start executing a task (triggers the workflow).
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const scheduler = getTaskScheduler();
    const task = scheduler.getTask(req.params.id);

    if (!task) {
      const response: ApiResponse<null> = { code: 404, data: null, message: 'Task not found' };
      res.status(404).json(response);
      return;
    }

    // Start the task asynchronously — don't await the full workflow
    scheduler.startTask(req.params.id).catch((err) => {
      console.error(`Task ${req.params.id} execution error:`, err);
    });

    const response: ApiResponse<{ started: boolean }> = {
      code: 0,
      data: { started: true },
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
 * POST /api/tasks/:id/intervene
 * Apply a human intervention to a task.
 * Body: { action: InterventionAction, modification?: string }
 */
router.post('/:id/intervene', async (req: Request, res: Response) => {
  try {
    const { action, modification } = req.body;

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: `Invalid or missing action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    // Validate modification for 'modify' action
    if (action === 'modify' && (!modification || typeof modification !== 'string' || modification.trim().length === 0)) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Modification text is required for modify action',
      };
      res.status(400).json(response);
      return;
    }

    const scheduler = getTaskScheduler();
    await scheduler.intervene(req.params.id, action, modification);

    const response: ApiResponse<{ intervened: boolean }> = {
      code: 0,
      data: { intervened: true },
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
 * GET /api/tasks/:id/steps
 * Get the steps of a task.
 */
router.get('/:id/steps', (req: Request, res: Response) => {
  try {
    const scheduler = getTaskScheduler();
    const steps = scheduler.getTaskSteps(req.params.id);

    const response: ApiResponse<TaskStep[]> = { code: 0, data: steps, message: 'success' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

export default router;
