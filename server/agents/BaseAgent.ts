import { randomUUID } from 'node:crypto';
import type {
  Agent,
  AgentRole,
  AgentStatus,
  Memory,
  Task,
} from '../../shared/types';
import type { ModelGateway } from '../gateway/ModelGateway';
import { PromptBuilder } from '../gateway/PromptBuilder';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { logger } from '../lib/logger';

/**
 * BaseAgent is the abstract base class for all EvoCode agents.
 * Encapsulates common functionality:
 * - State machine management (idle → thinking → executing → completed/error)
 * - Relevant memory retrieval and prompt injection
 * - Model gateway calls via PromptBuilder
 * - WebSocket event broadcasting for status changes
 * - Audit logging for all agent actions
 *
 * Subclasses must implement buildSystemPrompt() to provide agent-specific instructions.
 */
export abstract class BaseAgent {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentAction: string;
  taskIds: string[];
  startedAt: number;
  modelProvider: string;
  tokenUsage: number;

  protected gateway: ModelGateway;
  protected memoryStore: MemoryStore;
  protected auditLogger: AuditLogger;
  protected wsHandler: WebSocketHandler;

  /**
   * Create a new BaseAgent instance.
   * @param role - The agent's role (requirements, architecture, coding, testing, review)
   * @param gateway - ModelGateway for LLM API calls
   * @param memoryStore - MemoryStore for relevant memory retrieval
   * @param auditLogger - AuditLogger for action logging
   * @param wsHandler - WebSocketHandler for real-time event broadcasting
   */
  constructor(
    role: AgentRole,
    gateway: ModelGateway,
    memoryStore: MemoryStore,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    this.id = randomUUID();
    this.role = role;
    this.status = 'idle';
    this.currentAction = '等待任务分配';
    this.taskIds = [];
    this.startedAt = Date.now();
    this.modelProvider = gateway.getCurrentConfig().provider;
    this.tokenUsage = 0;
    this.gateway = gateway;
    this.memoryStore = memoryStore;
    this.auditLogger = auditLogger;
    this.wsHandler = wsHandler;
  }

  /**
   * Update the agent's status and optionally its current action.
   * Broadcasts an 'agent:status_changed' WebSocket event and logs an audit entry.
   * @param status - New status to set
   * @param action - Optional description of the current action
   */
  protected setStatus(status: AgentStatus, action?: string): void {
    this.status = status;
    if (action) {
      this.currentAction = action;
    }

    // Broadcast status change to all WebSocket clients
    this.wsHandler.broadcast('agent:status_changed', {
      agentId: this.id,
      role: this.role,
      status: this.status,
      action: this.currentAction,
    });

    // Log to audit trail
    this.auditLogger.log({
      taskId: this.taskIds[this.taskIds.length - 1] ?? 'unknown',
      agentId: this.id,
      eventType: 'agent_action',
      description: `[${this.role}] Status → ${status}${action ? ': ' + action : ''}`,
      details: { role: this.role, status, action: this.currentAction },
    });

    logger.debug('Agent', `[${this.role}] ${status}${action ? ' — ' + action : ''}`);
  }

  /**
   * Retrieve memories relevant to the given context.
   * @param context - Context string to search for relevant memories
   * @returns Array of relevant Memory objects
   */
  protected async retrieveRelevantMemories(context: string): Promise<Memory[]> {
    try {
      return this.memoryStore.retrieveRelevant(context);
    } catch (err) {
      logger.warn('Agent', `[${this.role}] Failed to retrieve memories: ${err instanceof Error ? err.message : 'unknown'}`);
      return [];
    }
  }

  /**
   * Build the system prompt specific to this agent's role.
   * Subclasses must implement this to provide role-specific instructions.
   * @returns System prompt string
   */
  protected abstract buildSystemPrompt(): string;

  /**
   * Execute the agent's task using the model gateway.
   * Implements the common execution flow:
   * 1. Set status to 'thinking'
   * 2. Retrieve relevant memories
   * 3. Build system prompt and messages
   * 4. Set status to 'executing'
   * 5. Call model gateway
   * 6. Accumulate token usage
   * 7. Set status to 'completed'
   * 8. Return model response content
   *
   * @param task - The task being executed
   * @param input - Input text (user description or previous agent's output)
   * @returns Model response content string
   */
  async execute(task: Task, input: string): Promise<string> {
    // Track task association
    if (!this.taskIds.includes(task.id)) {
      this.taskIds.push(task.id);
    }

    try {
      // Phase 1: Thinking — analyze the task and retrieve context
      this.setStatus('thinking', `分析任务: ${task.title}`);

      const memories = await this.retrieveRelevantMemories(input);
      const systemPrompt = this.buildSystemPrompt();
      const messages = PromptBuilder.build(systemPrompt, input, memories);

      // Phase 2: Executing — call the model
      this.setStatus('executing', '调用模型生成结果');

      const response = await this.gateway.chat(messages);
      this.tokenUsage += response.tokenUsage.total;

      // Broadcast the action result
      this.wsHandler.broadcast('agent:action', {
        agentId: this.id,
        role: this.role,
        action: `完成处理，消耗 ${response.tokenUsage.total} tokens`,
      });

      // Phase 3: Completed
      this.setStatus('completed', '处理完成');

      return response.content;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.setStatus('error', `执行失败: ${errorMsg}`);
      logger.error('Agent', `[${this.role}] Execution failed: ${errorMsg}`);
      throw err;
    }
  }

  /**
   * Convert this agent to the Agent interface from shared/types.ts.
   * Used for serialization to the frontend.
   * @returns Agent object with current state
   */
  toAgent(): Agent {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      currentAction: this.currentAction,
      taskIds: [...this.taskIds],
      startedAt: this.startedAt,
      modelProvider: this.gateway.getCurrentConfig().provider,
      tokenUsage: this.tokenUsage,
    };
  }
}
