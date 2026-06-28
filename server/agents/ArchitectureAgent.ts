import { BaseAgent } from './BaseAgent';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';

/**
 * ArchitectureAgent — designs the technical architecture based on
 * the requirements document from RequirementsAgent.
 *
 * Responsibilities:
 * - Select appropriate technology stack
 * - Design file/directory structure
 * - Define data flow and component relationships
 * - Identify key modules and their responsibilities
 */
export class ArchitectureAgent extends BaseAgent {
  /**
   * Create an ArchitectureAgent.
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
    super('architecture', gateway, memoryStore, auditLogger, wsHandler);
  }

  /**
   * Build the system prompt for architecture design.
   * @returns System prompt string guiding the model to produce a technical design
   */
  protected buildSystemPrompt(): string {
    return `你是一位资深的软件架构师。你的任务是基于需求文档，设计技术方案和系统架构。

请按照以下格式输出：

## 技术选型
- 前端框架: [选择及理由]
- 后端框架: [选择及理由]
- 数据库: [选择及理由]
- 其他关键依赖: [列出及理由]

## 文件结构
\`\`\`
项目根目录/
├── src/          # 源代码
│   ├── components/  # 组件
│   ├── pages/       # 页面
│   └── ...
└── ...
\`\`\`

## 核心模块设计
### [模块名]
- 职责: [描述]
- 接口: [关键接口定义]
- 依赖: [依赖的其他模块]

## 数据流
[描述数据如何在各模块间流转]

## 关键技术决策
1. [决策点]: [选择及理由]

注意事项：
- 技术方案要务实，选择成熟可靠的技术栈
- 文件结构要清晰，符合最佳实践
- 考虑可维护性和可扩展性
- 输出使用中文`;
  }
}
