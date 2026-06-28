import type { ChatMessage, ModelConfig, ModelResponse, ProviderInfo } from '../../../shared/types';
import type { IProvider } from '../ModelGateway';

/** Default API endpoint for Ollama (local) */
const DEFAULT_BASE_URL = 'http://localhost:11434';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Ollama local model provider adapter.
 * Implements the IProvider interface to call Ollama's local API.
 * Ollama runs locally and does not require an API key.
 * Note: Response times may be longer for local inference, hence the 60s timeout.
 */
export class OllamaProvider implements IProvider {
  /**
   * Send a chat completion request to Ollama's local API.
   * @param messages - Array of chat messages (system/user/assistant)
   * @param config - Model configuration with model name, baseUrl, etc.
   * @returns Standardized ModelResponse
   * @throws Error if API call fails or Ollama is not running
   */
  async chat(messages: ChatMessage[], config: ModelConfig): Promise<ModelResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/api/chat`;

    const body = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: config.temperature ?? 0.7,
        num_predict: config.maxTokens ?? 4096,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as {
        message: { role: string; content: string };
        prompt_eval_count: number;
        eval_count: number;
        model: string;
      };

      const promptTokens = data.prompt_eval_count ?? 0;
      const completionTokens = data.eval_count ?? 0;

      return {
        content: data.message?.content ?? '',
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        model: data.model,
        provider: 'ollama',
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Ollama API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get provider information for Ollama.
   * @returns ProviderInfo with available local models
   */
  getInfo(): ProviderInfo {
    return {
      provider: 'ollama',
      name: 'Ollama (Local)',
      models: ['llama3.1', 'qwen2.5', 'deepseek-coder-v2', 'codellama'],
      isLocal: true,
    };
  }
}
