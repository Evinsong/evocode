import type { ChatMessage, Memory } from '../../shared/types';

/**
 * PromptBuilder constructs the message array sent to LLM providers.
 * Handles system prompt assembly, memory injection, and user input formatting.
 */
export class PromptBuilder {
  /**
   * Build a ChatMessage array from system prompt, user input, and optional memories.
   * Memory context is appended to the system prompt to provide relevant context.
   * @param systemPrompt - The agent-specific system prompt
   * @param userInput - The user's input or previous agent's output
   * @param memories - Optional relevant memories to inject into context
   * @returns Array of ChatMessage objects ready for the model API
   */
  static build(systemPrompt: string, userInput: string, memories?: Memory[]): ChatMessage[] {
    let fullSystemPrompt = systemPrompt;

    if (memories && memories.length > 0) {
      const memoryContext = PromptBuilder.formatMemories(memories);
      fullSystemPrompt += `\n\n## 相关记忆\n${memoryContext}`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: userInput },
    ];

    return messages;
  }

  /**
   * Format an array of memories into a text block for prompt injection.
   * Each memory is formatted as: "[{type}] {key}: {value}"
   * @param memories - Array of Memory objects to format
   * @returns Formatted memory text block
   */
  static formatMemories(memories: Memory[]): string {
    return memories
      .map((m) => `[${m.type}] ${m.key}: ${m.value}`)
      .join('\n');
  }
}
