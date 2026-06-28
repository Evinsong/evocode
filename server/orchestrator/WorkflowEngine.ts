import { randomUUID } from 'node:crypto';
import type {
  AgentRole,
  Task,
  TaskResult,
  TaskStep,
  GeneratedFile,
} from '../../shared/types';
import type { AgentManager } from '../agents/AgentManager';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { logger } from '../lib/logger';

/** Custom error thrown when a task is cancelled during workflow execution */
export class TaskCancelledError extends Error {
  taskId: string;

  constructor(taskId: string) {
    super(`Task ${taskId} was cancelled`);
    this.name = 'TaskCancelledError';
    this.taskId = taskId;
  }
}

/** Ordered sequence of agent roles for the sequential workflow */
const WORKFLOW_SEQUENCE: AgentRole[] = ['requirements', 'architecture', 'coding', 'testing', 'review'];

/** Polling interval for checking pause status (ms) */
const PAUSE_POLL_INTERVAL_MS = 500;

/**
 * WorkflowEngine orchestrates multi-agent execution.
 * Implements the sequential workflow: requirements → architecture → coding → testing → review.
 * Each agent's output becomes the next agent's input.
 * Supports pause/resume via status polling and cancel via TaskCancelledError.
 */
export class WorkflowEngine {
  private agentManager: AgentManager;
  private auditLogger: AuditLogger;
  private wsHandler: WebSocketHandler;

  /**
   * Create a WorkflowEngine.
   * @param agentManager - AgentManager providing agent instances
   * @param auditLogger - AuditLogger for workflow event logging
   * @param wsHandler - WebSocketHandler for real-time status broadcasting
   */
  constructor(
    agentManager: AgentManager,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    this.agentManager = agentManager;
    this.auditLogger = auditLogger;
    this.wsHandler = wsHandler;
  }

  /**
   * Execute agents sequentially: requirements → architecture → coding → testing → review.
   * Each agent's output is passed as input to the next agent.
   * Checks for pause/cancel between each step.
   *
   * @param task - The task to execute (modified in place with steps and result)
   * @returns TaskResult with summary, metrics, and (for T04) generated files
   * @throws TaskCancelledError if the task is cancelled during execution
   */
  async runSequential(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let totalTokenUsage = 0;
    let lastOutput = task.description;

    logger.info('WorkflowEngine', `Starting sequential workflow for task ${task.id}: ${task.title}`);

    for (const role of WORKFLOW_SEQUENCE) {
      // Check for pause/cancel before each step
      await this.checkTaskStatus(task);

      const agent = this.agentManager.getAgent(role);
      if (!agent) {
        throw new Error(`Agent not found for role: ${role}`);
      }

      // Create task step record
      const step: TaskStep = {
        id: randomUUID(),
        taskId: task.id,
        agentRole: role,
        action: `执行 ${role} 阶段`,
        status: 'executing',
        input: lastOutput,
        output: '',
        startedAt: Date.now(),
      };

      // Broadcast that this agent is starting
      this.wsHandler.broadcast('agent:action', {
        agentId: agent.id,
        role: role,
        action: `开始处理: ${task.title}`,
      });

      try {
        // Execute the agent
        const output = await agent.execute(task, lastOutput);
        step.output = output;
        step.status = 'completed';
        step.completedAt = Date.now();
        totalTokenUsage += agent.tokenUsage;

        lastOutput = output;
        task.steps.push(step);

        // Broadcast step completion
        this.wsHandler.broadcast('agent:action', {
          agentId: agent.id,
          role: role,
          action: `${role} 阶段完成`,
        });

        logger.info('WorkflowEngine', `[${task.id}] ${role} step completed`);
      } catch (err) {
        step.status = 'error';
        step.output = err instanceof Error ? err.message : 'Unknown error';
        step.completedAt = Date.now();
        task.steps.push(step);

        logger.error('WorkflowEngine', `[${task.id}] ${role} step failed: ${step.output}`);
        throw err;
      }

      // Check for pause/cancel after each step
      await this.checkTaskStatus(task);
    }

    const duration = Date.now() - startTime;

    const result: TaskResult = {
      files: [] as GeneratedFile[],
      summary: lastOutput,
      metrics: {
        tokenUsage: totalTokenUsage,
        duration,
      },
    };

    logger.info('WorkflowEngine', `Workflow completed for task ${task.id} in ${duration}ms, ${totalTokenUsage} tokens`);

    return result;
  }

  /**
   * Check if the task is paused or cancelled.
   * If paused, waits in a polling loop until resumed or cancelled.
   * If cancelled, throws TaskCancelledError.
   * @param task - The task to check
   * @throws TaskCancelledError if the task status is 'cancelled'
   */
  private async checkTaskStatus(task: Task): Promise<void> {
    // Wait while paused
    while (task.status === 'paused') {
      logger.debug('WorkflowEngine', `[${task.id}] Task paused, waiting for resume...`);
      await new Promise((resolve) => setTimeout(resolve, PAUSE_POLL_INTERVAL_MS));
    }

    // Throw if cancelled
    if (task.status === 'cancelled') {
      throw new TaskCancelledError(task.id);
    }
  }

  /**
   * Execute agents in parallel.
   * P1 feature — not implemented in MVP.
   * @throws Error with 'NotImplemented' prefix
   */
  async runParallel(_task: Task): Promise<TaskResult> {
    throw new Error('NotImplemented: P1 feature — runParallel is not available in MVP');
  }
}
