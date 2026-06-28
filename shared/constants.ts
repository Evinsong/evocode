import type { AgentRole, AgentStatus, TaskStatus, WSEventType, ModelProvider } from './types';

export const AGENT_ROLES: AgentRole[] = ['requirements', 'architecture', 'coding', 'testing', 'review'];

export const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  requirements: '需求分析',
  architecture: '架构设计',
  coding: '编码',
  testing: '测试',
  review: '审查',
};

export const AGENT_STATUSES: AgentStatus[] = [
  'idle',
  'thinking',
  'executing',
  'waiting_review',
  'completed',
  'error',
];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  idle: '空闲',
  thinking: '思考中',
  executing: '执行中',
  waiting_review: '待审核',
  completed: '已完成',
  error: '错误',
};

export const TASK_STATUSES: TaskStatus[] = [
  'pending',
  'in_progress',
  'paused',
  'review',
  'completed',
  'failed',
  'cancelled',
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  paused: '已暂停',
  review: '待审核',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export const TASK_PRIORITY_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const WS_EVENT_TYPES: WSEventType[] = [
  'task:created',
  'task:updated',
  'task:completed',
  'task:failed',
  'agent:status_changed',
  'agent:action',
  'code:generated',
  'code:updated',
  'intervention:requested',
  'intervention:resolved',
  'review:required',
  'kanban:update',
];

export const MODEL_PROVIDERS: ModelProvider[] = ['openai', 'anthropic', 'ollama'];

export const PROVIDER_INFO: Record<ModelProvider, { name: string; isLocal: boolean }> = {
  openai: { name: 'OpenAI', isLocal: false },
  anthropic: { name: 'Anthropic', isLocal: false },
  ollama: { name: 'Ollama', isLocal: true },
};

export const DEFAULT_MODEL_CONFIG = {
  provider: 'openai' as ModelProvider,
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
};

export const CODE_FRAMEWORKS = ['react', 'vue', 'html'] as const;

export const CODE_FRAMEWORK_LABELS: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  html: 'HTML',
};
