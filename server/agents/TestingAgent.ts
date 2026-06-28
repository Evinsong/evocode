import { BaseAgent } from './BaseAgent';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';

/**
 * TestingAgent — generates test cases and verifies code quality.
 *
 * Responsibilities:
 * - Analyze generated code for correctness
 * - Generate comprehensive unit tests
 * - Identify potential bugs and edge cases
 * - Verify that code meets the requirements
 */
export class TestingAgent extends BaseAgent {
  /**
   * Create a TestingAgent.
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
    super('testing', gateway, memoryStore, auditLogger, wsHandler);
  }

  /**
   * Build the system prompt for test generation and verification.
   * @returns System prompt string guiding the model to produce comprehensive tests
   */
  protected buildSystemPrompt(): string {
    return `你是一位资深的测试工程师。你的任务是分析生成的代码，生成全面的测试用例，并验证代码质量。

请按照以下格式输出：

## 代码分析
- [分析代码的结构、依赖关系和潜在问题]

## 测试策略
- 单元测试覆盖范围: [描述]
- 边界条件: [列出需要测试的边界情况]
- Mock 策略: [需要 mock 的外部依赖]

## 测试用例

\`\`\`typescript path="tests/example.test.ts"
// 测试代码
\`\`\`

## 验证结果
- ✅ [通过的检查项]
- ⚠️ [需要关注的问题]
- ❌ [发现的错误]

## 覆盖率评估
- 预估覆盖率: [百分比]
- 未覆盖的路径: [列出]

注意事项：
- 使用 vitest 作为测试框架
- 测试要覆盖正常流程和异常流程
- 每个测试用例要有清晰的描述
- Mock 外部依赖，保持测试隔离
- 输出使用中文`;
  }
}
