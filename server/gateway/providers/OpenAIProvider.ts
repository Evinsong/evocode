import type { ChatMessage, ModelConfig, ModelResponse, ProviderInfo } from '../../../shared/types';
import type { IProvider } from '../ModelGateway';

/** Default API endpoint for OpenAI */
const DEFAULT_BASE_URL = 'https://api.openai.com';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * OpenAI API provider adapter.
 * Implements the IProvider interface to call OpenAI's Chat Completions API.
 * Supports custom base URLs for API proxies or Azure OpenAI.
 */
export class OpenAIProvider implements IProvider {
  /**
   * Send a chat completion request to OpenAI's API.
   * @param messages - Array of chat messages (system/user/assistant)
   * @param config - Model configuration with apiKey, model, baseUrl, etc.
   * @returns Standardized ModelResponse
   * @throws Error if API key missing or API call fails
   */
  async chat(messages: ChatMessage[], config: ModelConfig): Promise<ModelResponse> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required but not configured');
    }

    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/v1/chat/completions`;

    const body = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        model: string;
      };

      return {
        content: data.choices[0]?.message?.content ?? '',
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
          total: data.usage?.total_tokens ?? 0,
        },
        model: data.model,
        provider: 'openai',
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get provider information for OpenAI.
   * @returns ProviderInfo with available models
   */
  getInfo(): ProviderInfo {
    return {
      provider: 'openai',
      name: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-turbo-preview'],
      isLocal: false,
    };
  }
}
