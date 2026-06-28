// ============== Agent 相关 ==============
export type AgentRole = 'requirements' | 'architecture' | 'coding' | 'testing' | 'review';
export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting_review' | 'completed' | 'error';

export interface Agent {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentAction: string;
  taskIds: string[];
  startedAt: number;
  modelProvider: string;
  tokenUsage: number;
}

// ============== Task 相关 ==============
export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'review' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type InterventionAction = 'pause' | 'resume' | 'modify' | 'reject' | 'cancel';

export interface TaskStep {
  id: string;
  taskId: string;
  agentRole: AgentRole;
  action: string;
  status: AgentStatus;
  input: string;
  output: string;
  startedAt: number;
  completedAt?: number;
}

export interface TaskResult {
  files: GeneratedFile[];
  summary: string;
  metrics: { tokenUsage: number; duration: number };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string | null;
  parentTaskId: string | null;
  steps: TaskStep[];
  createdAt: number;
  updatedAt: number;
  result?: TaskResult;
}

// ============== Memory 相关 ==============
export type MemoryType = 'user_preference' | 'project_context' | 'historical_decision';

export interface Memory {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ============== Skill 相关 ==============
export type SkillSource = 'auto' | 'manual';

export interface Skill {
  id: string;
  name: string;
  description: string;
  pattern: string;
  usageCount: number;
  source: SkillSource;
  definition: string;
  createdAt: number;
  updatedAt: number;
}

// ============== AuditLog 相关 ==============
export type AuditEventType = 'agent_action' | 'human_intervention' | 'model_switch' | 'task_event' | 'review';

export interface AuditLog {
  id: string;
  taskId: string;
  agentId: string | null;
  eventType: AuditEventType;
  description: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface AuditFilter {
  taskId?: string;
  agentId?: string;
  eventType?: AuditEventType;
  startTime?: number;
  endTime?: number;
}

// ============== 模型网关相关 ==============
export type ModelProvider = 'openai' | 'anthropic' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelResponse {
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  model: string;
  provider: ModelProvider;
}

export interface ProviderInfo {
  provider: ModelProvider;
  name: string;
  models: string[];
  isLocal: boolean;
}

// ============== 代码生成相关 ==============
export type CodeFramework = 'react' | 'vue' | 'html';

export interface GeneratedFile {
  id: string;
  taskId: string;
  filename: string;
  path: string;
  content: string;
  language: string;
  framework: CodeFramework;
}

export interface CodeGenRequest {
  prompt: string;
  framework: CodeFramework;
  stylePreset?: string;
  projectId?: string;
}

// ============== WebSocket 事件 ==============
export type WSEventType =
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'task:failed'
  | 'agent:status_changed'
  | 'agent:action'
  | 'code:generated'
  | 'code:updated'
  | 'intervention:requested'
  | 'intervention:resolved'
  | 'review:required'
  | 'kanban:update';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: number;
}

// ============== API 统一响应 ==============
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

// ============== 应用设置 ==============
export interface AppSettings {
  model: ModelConfig;
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
  storage: { type: 'local'; path: string };
  defaultFramework: CodeFramework;
}
