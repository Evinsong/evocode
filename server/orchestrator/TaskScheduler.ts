import { randomUUID } from 'node:crypto';
import type {
  InterventionAction,
  Task,
  TaskPriority,
  TaskResult,
  TaskStep,
} from '../../shared/types';
import type { AgentManager } from '../agents/AgentManager';
import type { WorkflowEngine } from './WorkflowEngine';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { TaskCancelledError } from './WorkflowEngine';
import { logger } from '../lib/logger';

/**
 * TaskScheduler manages task lifecycle: creation, execution, and intervention.
 * Delegates actual agent orchestration to WorkflowEngine.
 * Handles human interventions (pause, resume, modify, reject, cancel).
 */
export class TaskScheduler {
  private tasks: Map<string, Task>;
  private agentManager: AgentManager;
  private workflowEngine: WorkflowEngine;
  private auditLogger: AuditLogger;
  private wsHandler: WebSocketHandler;

  /**
   * Create a TaskScheduler.
   * @param agentManager - AgentManager for agent access
   * @param workflowEngine - WorkflowEngine for task execution
   * @param auditLogger - AuditLogger for event logging
   * @param wsHandler - WebSocketHandler for real-time updates
   */
  constructor(
    agentManager: AgentManager,
    workflowEngine: WorkflowEngine,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    this.tasks = new Map();
    this.agentManager = agentManager;
    this.workflowEngine = workflowEngine;
    this.auditLogger = auditLogger;
    this.wsHandler = wsHandler;
  }

  /**
   * Create a new task.
   * @param title - Task title
   * @param description - Task description (natural language requirement)
   * @param priority - Task priority (default: 'medium')
   * @returns The created Task object
   */
  createTask(title: string, description: string, priority: TaskPriority = 'medium'): Task {
    const now = Date.now();
    const task: Task = {
      id: randomUUID(),
      title,
      description,
      status: 'pending',
      priority,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);

    // Broadcast task creation
    this.wsHandler.broadcast('task:created', task);

    // Log to audit
    this.auditLogger.log({
      taskId: task.id,
      agentId: null,
      eventType: 'task_event',
      description: `Task created: ${title}`,
      details: { taskId: task.id, title, priority },
    });

    logger.info('TaskScheduler', `Created task ${task.id}: ${title}`);

    return task;
  }

  /**
   * Get a task by ID.
   * @param taskId - Task UUID
   * @returns Task object or undefined if not found
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks.
   * @returns Array of all Task objects
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Start executing a task.
   * Sets status to 'in_progress', runs the workflow, and updates status on completion.
   * @param taskId - Task UUID to start
   * @throws Error if task not found
   */
  async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update status to in_progress
    task.status = 'in_progress';
    task.updatedAt = Date.now();
    this.wsHandler.broadcast('task:updated', task);

    logger.info('TaskScheduler', `Starting task ${taskId}`);

    try {
      const result = await this.workflowEngine.runSequential(task);

      // Update task with results
      task.result = result;
      task.status = 'completed';
      task.updatedAt = Date.now();

      this.wsHandler.broadcast('task:completed', task);

      this.auditLogger.log({
        taskId: task.id,
        agentId: null,
        eventType: 'task_event',
        description: `Task completed: ${task.title}`,
        details: { duration: result.metrics.duration, tokenUsage: result.metrics.tokenUsage },
      });

      logger.info('TaskScheduler', `Task ${taskId} completed`);
    } catch (err) {
      // Check if it was a cancellation
      if (err instanceof TaskCancelledError) {
        task.status = 'cancelled';
        task.updatedAt = Date.now();
        this.wsHandler.broadcast('task:failed', task);

        this.auditLogger.log({
          taskId: task.id,
          agentId: null,
          eventType: 'task_event',
          description: `Task cancelled: ${task.title}`,
          details: {},
        });

        logger.info('TaskScheduler', `Task ${taskId} cancelled`);
      } else {
        // Execution failed
        task.status = 'failed';
        task.updatedAt = Date.now();
        this.wsHandler.broadcast('task:failed', task);

        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.auditLogger.log({
          taskId: task.id,
          agentId: null,
          eventType: 'task_event',
          description: `Task failed: ${errorMsg}`,
          details: { error: errorMsg },
        });

        logger.error('TaskScheduler', `Task ${taskId} failed: ${errorMsg}`);
      }
    }
  }

  /**
   * Apply a human intervention to a task.
   * @param taskId - Task UUID
   * @param action - Intervention action (pause, resume, modify, reject, cancel)
   * @param modification - Optional modification text (for 'modify' action)
   * @throws Error if task not found
   */
  async intervene(taskId: string, action: InterventionAction, modification?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const now = Date.now();
    let description = '';

    switch (action) {
      case 'pause':
        task.status = 'paused';
        task.updatedAt = now;
        description = `Task paused: ${task.title}`;
        this.wsHandler.broadcast('task:updated', task);
        break;

      case 'resume':
        task.status = 'in_progress';
        task.updatedAt = now;
        description = `Task resumed: ${task.title}`;
        this.wsHandler.broadcast('task:updated', task);
        // Notify WorkflowEngine to unblock the paused task
        this.workflowEngine.resumeTask(taskId);
        break;

      case 'modify':
        if (modification) {
          task.description = modification;
          task.updatedAt = now;
        }
        description = `Task modified: ${task.title}`;
        this.wsHandler.broadcast('task:updated', task);
        break;

      case 'reject':
        task.updatedAt = now;
        description = `Task step rejected: ${task.title}`;
        this.wsHandler.broadcast('intervention:requested', { taskId, action: 'reject' });
        break;

      case 'cancel':
        task.status = 'cancelled';
        task.updatedAt = now;
        description = `Task cancelled: ${task.title}`;
        this.wsHandler.broadcast('task:failed', task);
        break;

      default:
        throw new Error(`Unknown intervention action: ${action}`);
    }

    // Log the intervention
    this.auditLogger.log({
      taskId: task.id,
      agentId: null,
      eventType: 'human_intervention',
      description,
      details: { action, modification },
    });

    // Broadcast intervention resolution
    this.wsHandler.broadcast('intervention:resolved', { taskId, action });

    logger.info('TaskScheduler', `Intervention '${action}' applied to task ${taskId}`);
  }

  /**
   * Get the steps of a task.
   * @param taskId - Task UUID
   * @returns Array of TaskStep objects, or empty array if task not found
   */
  getTaskSteps(taskId: string): TaskStep[] {
    const task = this.tasks.get(taskId);
    return task ? task.steps : [];
  }
}
