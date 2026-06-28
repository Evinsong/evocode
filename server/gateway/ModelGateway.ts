import type { ChatMessage, ModelConfig, ModelProvider, ModelResponse, ProviderInfo } from '../../shared/types';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { config } from '../lib/config';
import { decrypt } from '../lib/crypto';

/**
 * Interface that all model provider adapters must implement.
 * Each provider (OpenAI, Anthropic, Ollama) implements this interface
 * to adapt the unified ModelGateway API to their specific API format.
 */
export interface IProvider {
  /**
   * Send a chat completion request to the provider's API.
   * @param messages - Array of chat messages (system/user/assistant)
   * @param config - Model configuration including API key, model name, etc.
   * @returns Standardized ModelResponse
   */
  chat(messages: ChatMessage[], config: ModelConfig): Promise<ModelResponse>;

  /**
   * Get information about this provider (name, available models, etc.)
   * @returns ProviderInfo object
   */
  getInfo(): ProviderInfo;
}

/**
 * ModelGateway provides a unified interface for calling different LLM providers.
 * Supports runtime provider switching (hot-swap), configuration updates,
 * and automatic API key decryption.
 */
export class ModelGateway {
  private providers: Map<ModelProvider, IProvider>;
  private currentConfig: ModelConfig;
  private auditLogger: AuditLogger;
  private wsHandler: WebSocketHandler;

  /**
   * Create a ModelGateway with an initial configuration.
   * @param initialConfig - Initial model configuration (apiKey may be encrypted)
   * @param auditLogger - AuditLogger for recording model switch events
   * @param wsHandler - WebSocketHandler for broadcasting status changes
   */
  constructor(
    initialConfig: ModelConfig,
    auditLogger: AuditLogger,
    wsHandler: WebSocketHandler,
  ) {
    this.providers = new Map();
    this.currentConfig = { ...initialConfig };
    this.auditLogger = auditLogger;
    this.wsHandler = wsHandler;
  }

  /**
   * Register a provider adapter.
   * @param provider - Provider type to register
   * @param adapter - Provider adapter implementing IProvider
   */
  registerProvider(provider: ModelProvider, adapter: IProvider): void {
    this.providers.set(provider, adapter);
  }

  /**
   * Send a chat request using the currently configured provider.
   * Automatically decrypts the API key before passing to the provider.
   * @param messages - Array of chat messages
   * @returns Standardized ModelResponse from the provider
   * @throws Error if provider not registered or API call fails
   */
  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const providerType = this.currentConfig.provider;
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new Error(`Provider '${providerType}' is not registered`);
    }

    // Build config to pass to provider, decrypting apiKey if needed
    const configToPass: ModelConfig = { ...this.currentConfig };

    // The apiKey in currentConfig may be encrypted (stored from settings DB)
    if (configToPass.apiKey) {
      configToPass.apiKey = this.decryptApiKey(configToPass.apiKey);
    }

    return provider.chat(messages, configToPass);
  }

  /**
   * Decrypt an API key if it appears to be encrypted.
   * If decryption fails, returns the original value (may be plaintext).
   * @param apiKey - Potentially encrypted API key
   * @returns Decrypted plaintext API key
   */
  private decryptApiKey(apiKey: string): string {
    if (!config.encryptionKey) {
      // No encryption key configured — apiKey is stored in plaintext
      return apiKey;
    }

    try {
      return decrypt(apiKey, config.encryptionKey);
    } catch {
      // Decryption failed — apiKey might already be plaintext
      return apiKey;
    }
  }

  /**
   * Switch the active model provider at runtime.
   * @param provider - New provider to switch to
   * @param model - Optional model name to use with the new provider
   */
  switchProvider(provider: ModelProvider, model?: string): void {
    const oldProvider = this.currentConfig.provider;
    this.currentConfig.provider = provider;

    if (model) {
      this.currentConfig.model = model;
    }

    // Log the provider switch
    this.auditLogger.log({
      taskId: 'system',
      agentId: null,
      eventType: 'model_switch',
      description: `Switched model provider from ${oldProvider} to ${provider}/${model ?? this.currentConfig.model}`,
      details: { from: oldProvider, to: provider, model: model ?? this.currentConfig.model },
    });
  }

  /**
   * Update the current model configuration.
   * @param config - Partial configuration to merge into current config
   */
  updateConfig(partialConfig: Partial<ModelConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...partialConfig };
  }

  /**
   * Get the current model configuration.
   * Note: apiKey in the returned config may be encrypted.
   * @returns Current ModelConfig
   */
  getCurrentConfig(): ModelConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get information about all registered providers.
   * @returns Array of ProviderInfo objects
   */
  getProviderInfos(): ProviderInfo[] {
    const infos: ProviderInfo[] = [];
    for (const adapter of this.providers.values()) {
      infos.push(adapter.getInfo());
    }
    return infos;
  }
}
