import type { ChatMessage, ModelConfig, ModelResponse, ProviderInfo } from '../../../shared/types';
import type { IProvider } from '../ModelGateway';

/** Default API endpoint for Anthropic */
const DEFAULT_BASE_URL = 'https://api.anthropic.com';

/** Anthropic API version header */
const ANTHROPIC_VERSION = '2023-06-01';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Anthropic API provider adapter.
 * Implements the IProvider interface to call Anthropic's Messages API.
 * Handles the Anthropic-specific request/response format (system message
 * as separate parameter, x-api-key header, etc.).
 */
export class AnthropicProvider implements IProvider {
  /**
   * Send a chat completion request to Anthropic's Messages API.
   * @param messages - Array of chat messages (system/user/assistant)
   * @param config - Model configuration with apiKey, model, baseUrl, etc.
   * @returns Standardized ModelResponse
   * @throws Error if API key missing or API call fails
   */
  async chat(messages: ChatMessage[], config: ModelConfig): Promise<ModelResponse> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required but not configured');
    }

    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/v1/messages`;

    // Anthropic API: system message is a separate parameter, not in messages array
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages,
      max_tokens: config.maxTokens ?? 4096,
    };

    if (config.temperature !== undefined) {
      body.temperature = config.temperature;
    }

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
        usage: { input_tokens: number; output_tokens: number };
        model: string;
      };

      const content = data.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') ?? '';

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;

      return {
        content,
        tokenUsage: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens,
        },
        model: data.model,
        provider: 'anthropic',
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Anthropic API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get provider information for Anthropic.
   * @returns ProviderInfo with available models
   */
  getInfo(): ProviderInfo {
    return {
      provider: 'anthropic',
      name: 'Anthropic',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      isLocal: false,
    };
  }
}
