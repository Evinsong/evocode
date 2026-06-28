import type { Agent, AgentRole } from '../../shared/types';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { BaseAgent } from './BaseAgent';
import { RequirementsAgent } from './RequirementsAgent';
import { ArchitectureAgent } from './ArchitectureAgent';
import { CodingAgent } from './CodingAgent';
import { TestingAgent } from './TestingAgent';
import { ReviewAgent } from './ReviewAgent';
import { logger } from '../lib/logger';

/** Ordered list of all built-in agent roles */
const ALL_ROLES: AgentRole[] = ['requirements', 'architecture', 'coding', 'testing', 'review'];

/**
 * AgentManager is the registry for all agent instances.
 * Manages the lifecycle of the 5 built-in agents and provides
 * lookup and status query capabilities.
 */
export class AgentManager {
  private agents: Map<AgentRole, BaseAgent>;

  /**
   * Create an AgentManager and initialize all 5 built-in agents.
   * @param gateway - ModelGateway shared by all agents
   * @param memoryStore - MemoryStore shared by all agents
   * @param auditLogger - AuditLogger shared by all agents
   * @param wsHandler - WebSocketHandler shared by all agents
   */
  constructor(
    gateway: ModelGateway,
    memoryStore: MemoryStore,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    this.agents = new Map();

    // Initialize all 5 built-in agents
    const requirements = new RequirementsAgent(gateway, memoryStore, auditLogger, wsHandler);
    const architecture = new ArchitectureAgent(gateway, memoryStore, auditLogger, wsHandler);
    const coding = new CodingAgent(gateway, memoryStore, auditLogger, wsHandler);
    const testing = new TestingAgent(gateway, memoryStore, auditLogger, wsHandler);
    const review = new ReviewAgent(gateway, memoryStore, auditLogger, wsHandler);

    this.agents.set('requirements', requirements);
    this.agents.set('architecture', architecture);
    this.agents.set('coding', coding);
    this.agents.set('testing', testing);
    this.agents.set('review', review);

    logger.info('AgentManager', `Initialized ${this.agents.size} agents: ${ALL_ROLES.join(', ')}`);
  }

  /**
   * Get an agent by its role.
   * @param role - Agent role to look up
   * @returns The BaseAgent instance or undefined if not found
   */
  getAgent(role: AgentRole): BaseAgent | undefined {
    return this.agents.get(role);
  }

  /**
   * Get all agent instances.
   * @returns Array of all BaseAgent instances
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get the status of all agents as Agent interface objects.
   * Used for serializing to the frontend (e.g., kanban board).
   * @returns Array of Agent objects with current status
   */
  getAgentStatuses(): Agent[] {
    return this.getAllAgents().map((agent) => agent.toAgent());
  }

  /**
   * Reset a specific agent to idle status.
   * Clears task associations and resets token usage.
   * @param role - Agent role to reset
   */
  resetAgent(role: AgentRole): void {
    const agent = this.agents.get(role);
    if (agent) {
      agent.status = 'idle';
      agent.currentAction = '等待任务分配';
      agent.taskIds = [];
      agent.tokenUsage = 0;
      logger.debug('AgentManager', `Reset agent: ${role}`);
    }
  }

  /**
   * Reset all agents to idle status.
   */
  resetAll(): void {
    for (const role of ALL_ROLES) {
      this.resetAgent(role);
    }
    logger.info('AgentManager', 'All agents reset to idle');
  }
}
