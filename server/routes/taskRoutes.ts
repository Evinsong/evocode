import { Router, type Request, type Response } from 'express';
import { getTaskScheduler } from '../services/container';
import type { ApiResponse, InterventionAction, Task, TaskPriority, TaskStep } from '../../shared/types';

const router = Router();

/**
 * POST /api/tasks
 * Create a new task.
 * Body: { title: string, description: string, priority?: TaskPriority }
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !description) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required fields: title, description',
      };
      res.status(400).json(response);
      return;
    }

    const scheduler = getTaskScheduler();
    const task = scheduler.createTask(
      String(title),
      String(description),
      priority as TaskPriority | undefined,
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

    if (!action) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required field: action',
      };
      res.status(400).json(response);
      return;
    }

    const scheduler = getTaskScheduler();
    await scheduler.intervene(req.params.id, action as InterventionAction, modification);

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
