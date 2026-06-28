import { BaseAgent } from './BaseAgent';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';

/**
 * CodingAgent — generates code based on the architecture design.
 *
 * Responsibilities:
 * - Translate architecture design into concrete code
 * - Generate all necessary files (components, utilities, configs)
 * - Ensure code follows best practices and design standards
 * - Produce clean, readable, well-commented code
 *
 * Note: The actual code generation with aesthetic standards is handled
 * by the CodeGenerator in T04. This agent handles the model-level
 * prompt construction and response handling.
 */
export class CodingAgent extends BaseAgent {
  /**
   * Create a CodingAgent.
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
    super('coding', gateway, memoryStore, auditLogger, wsHandler);
  }

  /**
   * Build the system prompt for code generation.
   * @returns System prompt string guiding the model to produce high-quality code
   */
  protected buildSystemPrompt(): string {
    return `你是一位资深的全栈开发工程师。你的任务是基于架构设计方案，生成高质量的代码。

请遵循以下原则：

## 代码规范
- 使用 TypeScript，严格类型标注
- 遵循 Google 风格代码规范
- 每个文件完整可用，不使用占位符或 TODO
- 函数和类添加 TSDoc 注释
- 变量命名清晰，使用有意义的名称

## 输出格式
对每个生成的文件，使用以下格式：

\`\`\`typescript path="src/components/Example.tsx"
// 文件内容
\`\`\`

## 质量要求
- 代码必须完整、可运行
- 实现所有必要的错误处理
- 组件设计要美观、现代、响应式
- 使用 CSS Modules 或 Tailwind CSS 进行样式管理
- 代码结构清晰，模块化程度高

## 审美标准
- 遵循 8px 网格间距系统
- 配色和谐，主色调与辅助色搭配合理
- 排版层级清晰（标题、正文、辅助文字）
- 交互元素有适当的 hover/active 状态
- 空状态和加载状态设计完善

注意事项：
- 不要生成测试代码（测试由专门Agent负责）
- 确保所有导入路径正确
- 优先使用函数式组件和 Hooks
- 输出代码使用英文注释，说明使用中文`;
  }
}
