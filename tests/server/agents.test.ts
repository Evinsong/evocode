import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModelConfig, ModelResponse, Memory, ChatMessage } from '../../shared/types';
import { PromptBuilder } from '../../server/gateway/PromptBuilder';
import { BaseAgent } from '../../server/agents/BaseAgent';
import { AgentManager } from '../../server/agents/AgentManager';
import type { ModelGateway } from '../../server/gateway/ModelGateway';
import type { MemoryStore } from '../../server/memory/MemoryStore';
import type { AuditLogger } from '../../server/memory/AuditLogger';
import type { WebSocketHandler } from '../../server/ws/WebSocketHandler';

// ============== Mock Factories ==============

/** Create a mock ModelGateway */
function createMockGateway(): ModelGateway {
  const mockResponse: ModelResponse = {
    content: 'Mock LLM response',
    tokenUsage: { prompt: 50, completion: 100, total: 150 },
    model: 'gpt-4o-mock',
    provider: 'openai',
  };

  const mockConfig: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  };

  return {
    getCurrentConfig: vi.fn().mockReturnValue(mockConfig),
    chat: vi.fn().mockResolvedValue(mockResponse),
    registerProvider: vi.fn(),
    switchProvider: vi.fn(),
    updateConfig: vi.fn(),
    getProviderInfos: vi.fn().mockReturnValue([]),
  } as unknown as ModelGateway;
}

/** Create a mock MemoryStore */
function createMockMemoryStore(memories: Memory[] = []): MemoryStore {
  return {
    retrieveRelevant: vi.fn().mockReturnValue(memories),
    save: vi.fn(),
    get: vi.fn(),
    findByType: vi.fn(),
    search: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as MemoryStore;
}

/** Create a mock AuditLogger */
function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn().mockReturnValue({ id: 'audit-1', timestamp: Date.now() }),
    getByTask: vi.fn(),
    getByAgent: vi.fn(),
    query: vi.fn(),
  } as unknown as AuditLogger;
}

/** Create a mock WebSocketHandler */
function createMockWsHandler(): WebSocketHandler {
  return {
    broadcast: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    getClientCount: vi.fn().mockReturnValue(0),
  } as unknown as WebSocketHandler;
}

/** Concrete test agent that extends BaseAgent */
class TestAgent extends BaseAgent {
  constructor(
    gateway: ModelGateway,
    memoryStore: MemoryStore,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    super('requirements', gateway, memoryStore, auditLogger, wsHandler);
  }

  protected buildSystemPrompt(): string {
    return 'You are a test agent.';
  }
}

// ============== PromptBuilder Tests ==============
describe('PromptBuilder', () => {
  describe('build', () => {
    it('should build messages with system and user content', () => {
      const messages = PromptBuilder.build('System prompt', 'User input');

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('System prompt');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('User input');
    });

    it('should append memories to system prompt', () => {
      const memories: Memory[] = [
        {
          id: 'm1',
          type: 'user_preference',
          key: 'theme',
          value: 'dark',
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const messages = PromptBuilder.build('System prompt', 'User input', memories);

      expect(messages[0].content).toContain('System prompt');
      expect(messages[0].content).toContain('相关记忆');
      expect(messages[0].content).toContain('theme');
      expect(messages[0].content).toContain('dark');
    });

    it('should not append memory section when memories is empty', () => {
      const messages = PromptBuilder.build('System prompt', 'User input', []);

      expect(messages[0].content).toBe('System prompt');
      expect(messages[0].content).not.toContain('相关记忆');
    });

    it('should not append memory section when memories is undefined', () => {
      const messages = PromptBuilder.build('System prompt', 'User input');

      expect(messages[0].content).toBe('System prompt');
    });
  });

  describe('formatMemories', () => {
    it('should format memories as "[type] key: value"', () => {
      const memories: Memory[] = [
        { id: '1', type: 'user_preference', key: 'theme', value: 'dark', metadata: {}, createdAt: 0, updatedAt: 0 },
        { id: '2', type: 'project_context', key: 'framework', value: 'React', metadata: {}, createdAt: 0, updatedAt: 0 },
      ];

      const formatted = PromptBuilder.formatMemories(memories);

      expect(formatted).toContain('[user_preference] theme: dark');
      expect(formatted).toContain('[project_context] framework: React');
      expect(formatted.split('\n')).toHaveLength(2);
    });

    it('should return empty string for empty array', () => {
      expect(PromptBuilder.formatMemories([])).toBe('');
    });
  });
});

// ============== BaseAgent Tests ==============
describe('BaseAgent (via TestAgent)', () => {
  let gateway: ModelGateway;
  let memoryStore: MemoryStore;
  let auditLogger: AuditLogger;
  let wsHandler: WebSocketHandler;
  let agent: TestAgent;

  beforeEach(() => {
    gateway = createMockGateway();
    memoryStore = createMockMemoryStore();
    auditLogger = createMockAuditLogger();
    wsHandler = createMockWsHandler();
    agent = new TestAgent(gateway, memoryStore, auditLogger, wsHandler);
  });

  it('should initialize with idle status', () => {
    expect(agent.status).toBe('idle');
    expect(agent.role).toBe('requirements');
    expect(agent.id).toBeDefined();
    expect(agent.tokenUsage).toBe(0);
    expect(agent.taskIds).toHaveLength(0);
  });

  it('should set modelProvider from gateway config', () => {
    expect(agent.modelProvider).toBe('openai');
  });

  it('should transition through status states during execute', async () => {
    const task = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await agent.execute(task, 'Analyze this requirement');

    expect(result).toBe('Mock LLM response');
    expect(agent.status).toBe('completed');
    expect(agent.tokenUsage).toBe(150);
    expect(agent.taskIds).toContain('task-1');
  });

  it('should broadcast status changes via wsHandler', async () => {
    const task = {
      id: 'task-2',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'high' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await agent.execute(task, 'input');

    // Should have broadcast multiple times: thinking, executing, action, completed
    expect(wsHandler.broadcast).toHaveBeenCalledTimes(4);
    // Check that 'agent:status_changed' was broadcast
    const calls = vi.mocked(wsHandler.broadcast).mock.calls;
    const statusChangedCalls = calls.filter((c) => c[0] === 'agent:status_changed');
    expect(statusChangedCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('should log audit entries for status changes', async () => {
    const task = {
      id: 'task-3',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'low' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await agent.execute(task, 'input');

    // Should have logged multiple audit entries
    expect(auditLogger.log).toHaveBeenCalledTimes(3);
  });

  it('should retrieve memories during execution', async () => {
    const task = {
      id: 'task-4',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await agent.execute(task, 'analyze React components');

    expect(memoryStore.retrieveRelevant).toHaveBeenCalledWith('analyze React components');
  });

  it('should call gateway.chat with built messages', async () => {
    const task = {
      id: 'task-5',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await agent.execute(task, 'user input text');

    expect(gateway.chat).toHaveBeenCalledTimes(1);
    const messages = vi.mocked(gateway.chat).mock.calls[0][0] as ChatMessage[];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('test agent');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('user input text');
  });

  it('should set error status on execution failure', async () => {
    vi.mocked(gateway.chat).mockRejectedValueOnce(new Error('API timeout'));

    const task = {
      id: 'task-6',
      title: 'Test Task',
      description: 'Test description',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      assignedAgentId: null,
      parentTaskId: null,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await expect(agent.execute(task, 'input')).rejects.toThrow('API timeout');
    expect(agent.status).toBe('error');
  });

  it('should convert to Agent interface via toAgent()', () => {
    const agentInfo = agent.toAgent();

    expect(agentInfo.id).toBe(agent.id);
    expect(agentInfo.role).toBe('requirements');
    expect(agentInfo.status).toBe('idle');
    expect(agentInfo.modelProvider).toBe('openai');
    expect(agentInfo.tokenUsage).toBe(0);
    expect(agentInfo.taskIds).toEqual([]);
  });
});

// ============== AgentManager Tests ==============
describe('AgentManager', () => {
  let gateway: ModelGateway;
  let memoryStore: MemoryStore;
  let auditLogger: AuditLogger;
  let wsHandler: WebSocketHandler;
  let manager: AgentManager;

  beforeEach(() => {
    gateway = createMockGateway();
    memoryStore = createMockMemoryStore();
    auditLogger = createMockAuditLogger();
    wsHandler = createMockWsHandler();
    manager = new AgentManager(gateway, memoryStore, auditLogger, wsHandler);
  });

  it('should initialize with 5 agents', () => {
    const agents = manager.getAllAgents();
    expect(agents).toHaveLength(5);
  });

  it('should have all 5 agent roles', () => {
    const statuses = manager.getAgentStatuses();
    const roles = statuses.map((a) => a.role);
    expect(roles).toContain('requirements');
    expect(roles).toContain('architecture');
    expect(roles).toContain('coding');
    expect(roles).toContain('testing');
    expect(roles).toContain('review');
  });

  it('should get agent by role', () => {
    const codingAgent = manager.getAgent('coding');
    expect(codingAgent).toBeDefined();
    expect(codingAgent!.role).toBe('coding');
  });

  it('should return undefined for unknown role', () => {
    const agent = manager.getAgent('unknown' as never);
    expect(agent).toBeUndefined();
  });

  it('should return all agents with correct statuses', () => {
    const statuses = manager.getAgentStatuses();
    expect(statuses).toHaveLength(5);
    expect(statuses.every((a) => a.status === 'idle')).toBe(true);
  });

  it('should reset a specific agent', () => {
    const agent = manager.getAgent('requirements')!;
    agent.status = 'executing';
    agent.taskIds = ['task-1'];
    agent.tokenUsage = 500;

    manager.resetAgent('requirements');

    expect(agent.status).toBe('idle');
    expect(agent.taskIds).toHaveLength(0);
    expect(agent.tokenUsage).toBe(0);
  });

  it('should reset all agents', () => {
    // Modify all agents
    for (const agent of manager.getAllAgents()) {
      agent.status = 'completed';
      agent.tokenUsage = 100;
    }

    manager.resetAll();

    const statuses = manager.getAgentStatuses();
    expect(statuses.every((a) => a.status === 'idle')).toBe(true);
    expect(statuses.every((a) => a.tokenUsage === 0)).toBe(true);
  });
});
