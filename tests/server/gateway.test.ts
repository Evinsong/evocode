import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelConfig } from '../../shared/types';
import { ModelGateway } from '../../server/gateway/ModelGateway';
import { OpenAIProvider } from '../../server/gateway/providers/OpenAIProvider';
import { AnthropicProvider } from '../../server/gateway/providers/AnthropicProvider';
import { OllamaProvider } from '../../server/gateway/providers/OllamaProvider';
import type { AuditLogger } from '../../server/memory/AuditLogger';
import type { WebSocketHandler } from '../../server/ws/WebSocketHandler';

// ============== Mock Helpers ==============

/** Create a mock AuditLogger */
function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn().mockReturnValue({ id: 'audit-1', timestamp: Date.now() }),
    getByTask: vi.fn(),
    getByAgent: vi.fn(),
    query: vi.fn(),
  } as unknown as AuditLogger;
}

/** Create a mock WebSocketHandler */
function createMockWsHandler(): WebSocketHandler {
  return {
    broadcast: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    getClientCount: vi.fn().mockReturnValue(0),
  } as unknown as WebSocketHandler;
}

/** Create a mock fetch response */
function createMockResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  } as unknown as Response;
}

// ============== ModelGateway Tests ==============
describe('ModelGateway', () => {
  let auditLogger: AuditLogger;
  let wsHandler: WebSocketHandler;
  let gateway: ModelGateway;
  let initialConfig: ModelConfig;

  beforeEach(() => {
    auditLogger = createMockAuditLogger();
    wsHandler = createMockWsHandler();
    initialConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 4096,
    };
    gateway = new ModelGateway(initialConfig, auditLogger, wsHandler);
  });

  describe('registerProvider', () => {
    it('should register a provider', () => {
      const provider = new OpenAIProvider();
      gateway.registerProvider('openai', provider);

      const infos = gateway.getProviderInfos();
      expect(infos).toHaveLength(1);
      expect(infos[0].provider).toBe('openai');
    });

    it('should register multiple providers', () => {
      gateway.registerProvider('openai', new OpenAIProvider());
      gateway.registerProvider('anthropic', new AnthropicProvider());
      gateway.registerProvider('ollama', new OllamaProvider());

      const infos = gateway.getProviderInfos();
      expect(infos).toHaveLength(3);
    });
  });

  describe('getCurrentConfig', () => {
    it('should return the current configuration', () => {
      const config = gateway.getCurrentConfig();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o');
    });

    it('should return a copy, not the original', () => {
      const config1 = gateway.getCurrentConfig();
      config1.model = 'changed';
      const config2 = gateway.getCurrentConfig();
      expect(config2.model).toBe('gpt-4o');
    });
  });

  describe('switchProvider', () => {
    it('should switch the provider', () => {
      gateway.switchProvider('anthropic', 'claude-sonnet-4-20250514');

      const config = gateway.getCurrentConfig();
      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-sonnet-4-20250514');
    });

    it('should log the switch to audit', () => {
      gateway.switchProvider('ollama', 'llama3.1');

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'model_switch',
        }),
      );
    });

    it('should keep current model if not specified', () => {
      gateway.switchProvider('anthropic');
      const config = gateway.getCurrentConfig();
      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('gpt-4o');
    });
  });

  describe('updateConfig', () => {
    it('should merge partial config into current config', () => {
      gateway.updateConfig({ temperature: 0.5, maxTokens: 2048 });
      const config = gateway.getCurrentConfig();
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(2048);
      expect(config.provider).toBe('openai'); // unchanged
    });
  });

  describe('chat', () => {
    it('should call the registered provider', async () => {
      const mockProvider = {
        chat: vi.fn().mockResolvedValue({
          content: 'response',
          tokenUsage: { prompt: 10, completion: 20, total: 30 },
          model: 'gpt-4o',
          provider: 'openai' as const,
        }),
        getInfo: vi.fn().mockReturnValue({
          provider: 'openai' as const,
          name: 'OpenAI',
          models: ['gpt-4o'],
          isLocal: false,
        }),
      };
      gateway.registerProvider('openai', mockProvider);

      const messages = [
        { role: 'system' as const, content: 'system prompt' },
        { role: 'user' as const, content: 'user input' },
      ];

      const response = await gateway.chat(messages);

      expect(response.content).toBe('response');
      expect(mockProvider.chat).toHaveBeenCalledTimes(1);
    });

    it('should throw if provider not registered', async () => {
      const messages = [{ role: 'user' as const, content: 'input' }];
      await expect(gateway.chat(messages)).rejects.toThrow('not registered');
    });
  });
});

// ============== OpenAIProvider Tests ==============
describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
    vi.spyOn(global, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct provider info', () => {
    const info = provider.getInfo();
    expect(info.provider).toBe('openai');
    expect(info.name).toBe('OpenAI');
    expect(info.isLocal).toBe(false);
    expect(info.models.length).toBeGreaterThan(0);
  });

  it('should call OpenAI API and parse response', async () => {
    const mockData = {
      choices: [{ message: { content: 'Hello from GPT' } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      model: 'gpt-4o',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test',
    };

    const response = await provider.chat(
      [{ role: 'user', content: 'Hello' }],
      config,
    );

    expect(response.content).toBe('Hello from GPT');
    expect(response.tokenUsage.prompt).toBe(10);
    expect(response.tokenUsage.completion).toBe(20);
    expect(response.tokenUsage.total).toBe(30);
    expect(response.provider).toBe('openai');
  });

  it('should throw if API key is missing', async () => {
    const config: ModelConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };

    await expect(
      provider.chat([{ role: 'user', content: 'Hello' }], config),
    ).rejects.toThrow('API key is required');
  });

  it('should throw on non-200 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createMockResponse({ error: 'Unauthorized' }, false, 401),
    );

    const config: ModelConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'invalid-key',
    };

    await expect(
      provider.chat([{ role: 'user', content: 'Hello' }], config),
    ).rejects.toThrow('OpenAI API error (401)');
  });

  it('should use custom baseUrl when provided', async () => {
    const mockData = {
      choices: [{ message: { content: 'response' } }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      model: 'gpt-4o',
    };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      baseUrl: 'https://custom.api.proxy',
    };

    await provider.chat([{ role: 'user', content: 'Hello' }], config);

    expect(fetchSpy.mock.calls[0][0]).toBe('https://custom.api.proxy/v1/chat/completions');
  });
});

// ============== AnthropicProvider Tests ==============
describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    vi.spyOn(global, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct provider info', () => {
    const info = provider.getInfo();
    expect(info.provider).toBe('anthropic');
    expect(info.name).toBe('Anthropic');
    expect(info.isLocal).toBe(false);
  });

  it('should call Anthropic API and parse response', async () => {
    const mockData = {
      content: [{ type: 'text', text: 'Hello from Claude' }],
      usage: { input_tokens: 15, output_tokens: 25 },
      model: 'claude-sonnet-4-20250514',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'sk-ant-test',
    };

    const response = await provider.chat(
      [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
      config,
    );

    expect(response.content).toBe('Hello from Claude');
    expect(response.tokenUsage.prompt).toBe(15);
    expect(response.tokenUsage.completion).toBe(25);
    expect(response.tokenUsage.total).toBe(40);
    expect(response.provider).toBe('anthropic');
  });

  it('should throw if API key is missing', async () => {
    const config: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    };

    await expect(
      provider.chat([{ role: 'user', content: 'Hello' }], config),
    ).rejects.toThrow('API key is required');
  });

  it('should throw on non-200 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createMockResponse({ error: 'Forbidden' }, false, 403),
    );

    const config: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'invalid',
    };

    await expect(
      provider.chat([{ role: 'user', content: 'Hello' }], config),
    ).rejects.toThrow('Anthropic API error (403)');
  });

  it('should separate system message from conversation messages', async () => {
    const mockData = {
      content: [{ type: 'text', text: 'response' }],
      usage: { input_tokens: 5, output_tokens: 5 },
      model: 'claude-sonnet-4-20250514',
    };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'sk-ant-test',
    };

    await provider.chat(
      [
        { role: 'system', content: 'System instructions' },
        { role: 'user', content: 'User question' },
      ],
      config,
    );

    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(requestBody.system).toBe('System instructions');
    expect(requestBody.messages).toHaveLength(1);
    expect(requestBody.messages[0].role).toBe('user');
  });
});

// ============== OllamaProvider Tests ==============
describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    vi.spyOn(global, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct provider info', () => {
    const info = provider.getInfo();
    expect(info.provider).toBe('ollama');
    expect(info.name).toBe('Ollama (Local)');
    expect(info.isLocal).toBe(true);
  });

  it('should call Ollama API and parse response', async () => {
    const mockData = {
      message: { role: 'assistant', content: 'Hello from local model' },
      prompt_eval_count: 12,
      eval_count: 18,
      model: 'llama3.1',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'ollama',
      model: 'llama3.1',
    };

    const response = await provider.chat(
      [{ role: 'user', content: 'Hello' }],
      config,
    );

    expect(response.content).toBe('Hello from local model');
    expect(response.tokenUsage.prompt).toBe(12);
    expect(response.tokenUsage.completion).toBe(18);
    expect(response.tokenUsage.total).toBe(30);
    expect(response.provider).toBe('ollama');
  });

  it('should not require API key', async () => {
    const mockData = {
      message: { role: 'assistant', content: 'response' },
      prompt_eval_count: 5,
      eval_count: 5,
      model: 'qwen2.5',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'ollama',
      model: 'qwen2.5',
    };

    // Should not throw about missing API key
    const response = await provider.chat([{ role: 'user', content: 'Hello' }], config);
    expect(response.content).toBe('response');
  });

  it('should throw on non-200 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createMockResponse({ error: 'Model not found' }, false, 404),
    );

    const config: ModelConfig = {
      provider: 'ollama',
      model: 'nonexistent-model',
    };

    await expect(
      provider.chat([{ role: 'user', content: 'Hello' }], config),
    ).rejects.toThrow('Ollama API error (404)');
  });

  it('should use custom baseUrl when provided', async () => {
    const mockData = {
      message: { role: 'assistant', content: 'response' },
      prompt_eval_count: 5,
      eval_count: 5,
      model: 'llama3.1',
    };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'ollama',
      model: 'llama3.1',
      baseUrl: 'http://192.168.1.100:11434',
    };

    await provider.chat([{ role: 'user', content: 'Hello' }], config);

    expect(fetchSpy.mock.calls[0][0]).toBe('http://192.168.1.100:11434/api/chat');
  });

  it('should set stream to false in request body', async () => {
    const mockData = {
      message: { role: 'assistant', content: 'response' },
      prompt_eval_count: 5,
      eval_count: 5,
      model: 'llama3.1',
    };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(createMockResponse(mockData));

    const config: ModelConfig = {
      provider: 'ollama',
      model: 'llama3.1',
    };

    await provider.chat([{ role: 'user', content: 'Hello' }], config);

    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(requestBody.stream).toBe(false);
  });
});
