import { BaseAgent } from './BaseAgent';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';

/**
 * RequirementsAgent — analyzes natural language user input and produces
 * a structured requirements document.
 *
 * Responsibilities:
 * - Parse user's natural language description into structured requirements
 * - Identify functional requirements, non-functional requirements, and constraints
 * - Define acceptance criteria for each requirement
 */
export class RequirementsAgent extends BaseAgent {
  /**
   * Create a RequirementsAgent.
   * @param gateway - ModelGateway for LLM API calls
   * @param memoryStore - MemoryStore for memory retrieval
   * @param auditLogger - AuditLogger for action logging
   * @param wsHandler - WebSocketHandler for event broadcasting
   */
  constructor(
    gateway: ModelGateway,
    memoryStore: MemoryStore,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    super('requirements', gateway, memoryStore, auditLogger, wsHandler);
  }

  /**
   * Build the system prompt for requirements analysis.
   * @returns System prompt string guiding the model to produce structured requirements
   */
  protected buildSystemPrompt(): string {
    return `你是一位资深的需求分析专家。你的任务是分析用户的自然语言描述，将其转化为结构化的需求文档。

请按照以下格式输出：

## 需求概述
[简述项目目标和核心价值]

## 功能需求
1. [功能名称]: [详细描述]
2. ...

## 非功能需求
1. [需求类型]: [描述]（如性能、安全、可用性等）

## 技术约束
- [约束条件]

## 验收标准
1. [可验证的验收标准]
2. ...

注意事项：
- 仔细分析用户的真实意图，不要遗漏隐含需求
- 需求描述要具体、可验证
- 如有歧义，选择最合理的解释并标注假设
- 输出使用中文`;
  }
}
