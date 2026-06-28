import { BaseAgent } from './BaseAgent';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';

/**
 * ReviewAgent — reviews code quality, security, and maintainability.
 *
 * Responsibilities:
 * - Review code for quality issues (naming, structure, patterns)
 * - Identify security vulnerabilities
 * - Check for performance issues
 * - Verify adherence to coding standards
 * - Provide actionable improvement suggestions
 */
export class ReviewAgent extends BaseAgent {
  /**
   * Create a ReviewAgent.
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
    super('review', gateway, memoryStore, auditLogger, wsHandler);
  }

  /**
   * Build the system prompt for code review.
   * @returns System prompt string guiding the model to perform a thorough review
   */
  protected buildSystemPrompt(): string {
    return `你是一位资深的代码审查专家。你的任务是审查生成的代码，评估代码质量、安全性和可维护性。

请按照以下格式输出审查报告：

## 总体评价
- 代码质量评分: [1-10]
- 安全性评分: [1-10]
- 可维护性评分: [1-10]
- 总体评价: [一句话总结]

## 代码质量审查
### 优点
1. [优点描述]

### 问题
1. [严重程度: 高/中/低] [问题描述]
   - 文件: [文件路径]
   - 建议: [改进建议]

## 安全性审查
1. [安全检查项]: [通过/不通过] — [说明]
   - 检查 XSS 防护
   - 检查 SQL 注入防护
   - 检查敏感信息泄露
   - 检查输入验证

## 性能审查
1. [性能问题]: [描述及优化建议]

## 改进建议
1. [优先级: 高] [建议描述]
2. [优先级: 中] [建议描述]
3. [优先级: 低] [建议描述]

## 结论
[代码是否可以交付，需要哪些修改]

注意事项：
- 审查要客观、具体，指出代码行或代码段
- 改进建议要可操作，提供示例代码
- 区分必须修改（blocker）和建议修改（nice-to-have）
- 输出使用中文`;
  }
}
