import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AestheticEngine, type DesignStandards, type ThemePreset } from '../../server/codegen/AestheticEngine';
import { PreviewEngine } from '../../server/codegen/PreviewEngine';
import { CodeGenerator } from '../../server/codegen/CodeGenerator';
import type {
  ChatMessage,
  CodeFramework,
  CodeGenRequest,
  GeneratedFile,
  ModelResponse,
} from '../../shared/types';
import type { ModelGateway } from '../../server/gateway/ModelGateway';
import type { AuditLogger } from '../../server/memory/AuditLogger';
import type { WebSocketHandler } from '../../server/ws/WebSocketHandler';

// ============== Mock Helpers ==============

/** Create a mock ModelGateway */
function createMockGateway(response: ModelResponse): ModelGateway {
  return {
    chat: vi.fn().mockResolvedValue(response),
    registerProvider: vi.fn(),
    switchProvider: vi.fn(),
    updateConfig: vi.fn(),
    getCurrentConfig: vi.fn(),
    getProviderInfos: vi.fn(),
  } as unknown as ModelGateway;
}

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

/** Create a GeneratedFile with default values */
function createGeneratedFile(overrides: Partial<GeneratedFile> = {}): GeneratedFile {
  return {
    id: 'test-id',
    taskId: 'standalone',
    filename: 'App.tsx',
    path: 'src/App.tsx',
    content: 'export default function App() { return <div>Hello</div>; }',
    language: 'tsx',
    framework: 'react',
    ...overrides,
  };
}

// ============== AestheticEngine Tests ==============
describe('AestheticEngine', () => {
  let engine: AestheticEngine;

  beforeEach(() => {
    engine = new AestheticEngine();
  });

  describe('getDesignStandards', () => {
    it('should return complete design standards', () => {
      const standards = engine.getDesignStandards();

      expect(standards.spacing.grid).toBe(8);
      expect(standards.spacing.units).toBe('px');
      expect(standards.colors.primary).toBeDefined();
      expect(standards.colors.secondary).toBeDefined();
      expect(standards.colors.accent).toBeDefined();
      expect(standards.colors.neutral).toHaveLength(5);
      expect(standards.typography.fontFamily).toBeDefined();
      expect(standards.typography.scale.title).toBeDefined();
      expect(standards.typography.scale.subtitle).toBeDefined();
      expect(standards.typography.scale.body).toBeDefined();
      expect(standards.typography.scale.caption).toBeDefined();
      expect(standards.responsive.breakpoints.mobile).toBeDefined();
      expect(standards.responsive.breakpoints.tablet).toBeDefined();
      expect(standards.responsive.breakpoints.desktop).toBeDefined();
      expect(standards.components.borderRadius).toBeDefined();
      expect(standards.components.shadow).toBeDefined();
      expect(standards.components.transition).toBeDefined();
    });
  });

  describe('injectPrompt', () => {
    it('should append aesthetic specification to base prompt', () => {
      const basePrompt = 'Generate a login page';
      const result = engine.injectPrompt(basePrompt);

      expect(result).toContain(basePrompt);
      expect(result).toContain('STRICT DESIGN REQUIREMENTS');
      expect(result).toContain('Spacing System');
      expect(result).toContain('Color Palette');
      expect(result).toContain('Typography');
      expect(result).toContain('Responsive Breakpoints');
      expect(result).toContain('Component Standards');
      expect(result.length).toBeGreaterThan(basePrompt.length);
    });

    it('should include specific color values in injected prompt', () => {
      const result = engine.injectPrompt('test');
      const standards = engine.getDesignStandards();

      expect(result).toContain(standards.colors.primary);
      expect(result).toContain(standards.colors.secondary);
      expect(result).toContain(standards.colors.accent);
    });

    it('should include 8px grid specification', () => {
      const result = engine.injectPrompt('test');

      expect(result).toContain('8px Grid System');
      expect(result).toContain('multiples of 8');
    });

    it('should include responsive breakpoints', () => {
      const result = engine.injectPrompt('test');

      expect(result).toContain('640px');
      expect(result).toContain('1024px');
    });
  });

  describe('getThemePreset', () => {
    it('should return Modern preset for "modern"', () => {
      const preset = engine.getThemePreset('modern');

      expect(preset).not.toBeNull();
      expect(preset!.name).toBe('modern');
      expect(preset!.colors.primary).toBe('#4f46e5');
      expect(preset!.colors.secondary).toBe('#0ea5e9');
      expect(preset!.colors.accent).toBe('#f59e0b');
      expect(preset!.colors.background).toBe('#f8fafc');
    });

    it('should return Elegant preset for "elegant"', () => {
      const preset = engine.getThemePreset('elegant');

      expect(preset).not.toBeNull();
      expect(preset!.name).toBe('elegant');
      expect(preset!.colors.primary).toBe('#1e293b');
    });

    it('should return Vibrant preset for "vibrant"', () => {
      const preset = engine.getThemePreset('vibrant');

      expect(preset).not.toBeNull();
      expect(preset!.name).toBe('vibrant');
      expect(preset!.colors.primary).toBe('#059669');
    });

    it('should return null for nonexistent preset name', () => {
      const preset = engine.getThemePreset('nonexistent');

      expect(preset).toBeNull();
    });

    it('should be case-insensitive', () => {
      const preset = engine.getThemePreset('MODERN');

      expect(preset).not.toBeNull();
      expect(preset!.name).toBe('modern');
    });
  });

  describe('getAllPresets', () => {
    it('should return at least 3 presets', () => {
      const presets = engine.getAllPresets();

      expect(presets.length).toBeGreaterThanOrEqual(3);
    });

    it('should return presets with all required fields', () => {
      const presets = engine.getAllPresets();

      for (const preset of presets) {
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.colors.primary).toBeDefined();
        expect(preset.colors.secondary).toBeDefined();
        expect(preset.colors.accent).toBeDefined();
        expect(preset.colors.background).toBeDefined();
        expect(preset.colors.foreground).toBeDefined();
        expect(preset.typography.fontFamily).toBeDefined();
      }
    });
  });
});

// ============== PreviewEngine Tests ==============
describe('PreviewEngine', () => {
  let engine: PreviewEngine;

  beforeEach(() => {
    engine = new PreviewEngine();
  });

  describe('buildPreview', () => {
    it('should correctly assemble pure HTML files', () => {
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'index.html',
          path: 'index.html',
          language: 'html',
          content: '<!DOCTYPE html><html><head></head><body><h1>Hello</h1></body></html>',
        }),
        createGeneratedFile({
          filename: 'style.css',
          path: 'style.css',
          language: 'css',
          content: 'h1 { color: red; }',
        }),
      ];

      const result = engine.buildPreview(files);

      expect(result).toContain('<h1>Hello</h1>');
      expect(result).toContain('h1 { color: red; }');
      expect(result).toContain('<style>');
    });

    it('should auto-generate HTML wrapper for React component files', () => {
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'App.tsx',
          path: 'src/App.tsx',
          language: 'tsx',
          content: 'export default function App() { return <div>Hello React</div>; }',
        }),
      ];

      const result = engine.buildPreview(files);

      // Must contain React CDN
      expect(result).toContain('unpkg.com/react@18');
      expect(result).toContain('unpkg.com/react-dom@18');
      // Must contain Babel standalone
      expect(result).toContain('unpkg.com/@babel/standalone');
      // Must contain Tailwind CDN
      expect(result).toContain('cdn.tailwindcss.com');
      // Must contain type="text/babel" script
      expect(result).toContain('type="text/babel"');
      // Must render with ReactDOM.createRoot
      expect(result).toContain('ReactDOM.createRoot');
      expect(result).toContain('<App />');
    });

    it('should return minimal HTML template for empty file list', () => {
      const result = engine.buildPreview([]);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html>');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
    });

    it('should inject CSP meta tag into generated HTML', () => {
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'App.tsx',
          path: 'src/App.tsx',
          language: 'tsx',
          content: 'export default function App() { return <div>Test</div>; }',
        }),
      ];

      const result = engine.buildPreview(files);

      expect(result).toContain('Content-Security-Policy');
    });

    it('should inject CSS content into React preview', () => {
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'App.tsx',
          path: 'src/App.tsx',
          language: 'tsx',
          content: 'export default function App() { return <div>Styled</div>; }',
        }),
        createGeneratedFile({
          filename: 'styles.css',
          path: 'src/styles.css',
          language: 'css',
          content: '.custom { color: blue; }',
        }),
      ];

      const result = engine.buildPreview(files);

      expect(result).toContain('.custom { color: blue; }');
    });
  });

  describe('injectResources', () => {
    it('should inject Tailwind CDN if missing', () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const files: GeneratedFile[] = [];

      const result = engine.injectResources(html, files);

      expect(result).toContain('cdn.tailwindcss.com');
    });

    it('should not inject Tailwind CDN if already present', () => {
      const html =
        '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body></body></html>';
      const files: GeneratedFile[] = [];

      const result = engine.injectResources(html, files);

      // Should not have duplicate Tailwind CDN
      const tailwindCount = (result.match(/cdn\.tailwindcss\.com/g) ?? []).length;
      expect(tailwindCount).toBe(1);
    });

    it('should inject React CDN when React files are present', () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'App.tsx',
          path: 'src/App.tsx',
          language: 'tsx',
          content: '// React component',
        }),
      ];

      const result = engine.injectResources(html, files);

      expect(result).toContain('unpkg.com/react@18');
      expect(result).toContain('unpkg.com/react-dom@18');
      expect(result).toContain('unpkg.com/@babel/standalone');
    });

    it('should not inject React CDN when no React files present', () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const files: GeneratedFile[] = [
        createGeneratedFile({
          filename: 'index.html',
          path: 'index.html',
          language: 'html',
          content: '<p>Hello</p>',
        }),
      ];

      const result = engine.injectResources(html, files);

      expect(result).not.toContain('unpkg.com/react@18');
    });
  });
});

// ============== CodeGenerator Tests ==============
describe('CodeGenerator', () => {
  let generator: CodeGenerator;
  let gateway: ModelGateway;
  let aestheticEngine: AestheticEngine;
  let previewEngine: PreviewEngine;
  let wsHandler: WebSocketHandler;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    // Real AestheticEngine and PreviewEngine (not mocked)
    aestheticEngine = new AestheticEngine();
    previewEngine = new PreviewEngine();

    // Mock gateway, wsHandler, auditLogger
    const mockResponse: ModelResponse = {
      content: '',
      tokenUsage: { prompt: 100, completion: 200, total: 300 },
      model: 'gpt-4o',
      provider: 'openai',
    };
    gateway = createMockGateway(mockResponse);
    wsHandler = createMockWsHandler();
    auditLogger = createMockAuditLogger();

    generator = new CodeGenerator(
      gateway,
      aestheticEngine,
      previewEngine,
      wsHandler,
      auditLogger,
    );
  });

  describe('generate', () => {
    it('should follow the full generation flow: inject → chat → parse → return', async () => {
      // Setup: model returns a response with code blocks
      const modelResponse: ModelResponse = {
        content: 'Here is your code:\n\n```tsx path="src/App.tsx"\nexport default function App() {\n  return <div className="p-8">Hello</div>;\n}\n```\n\n```css path="src/styles.css"\n.app { padding: 16px; }\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: '生成一个简单的页面',
        framework: 'react',
      };

      const files = await generator.generate(request);

      // Verify the flow
      // 1. Gateway.chat was called with injected prompt
      expect(gateway.chat).toHaveBeenCalledTimes(1);
      const calledMessages = (gateway.chat as ReturnType<typeof vi.fn>).mock.calls[0][0] as ChatMessage[];
      expect(calledMessages.length).toBe(2);
      expect(calledMessages[0].role).toBe('system');
      expect(calledMessages[1].role).toBe('user');
      // User message should contain aesthetic injection
      expect(calledMessages[1].content).toContain('审美设计标准');

      // 2. Files were parsed from response
      expect(files.length).toBe(2);

      // 3. WebSocket broadcast was called
      expect(wsHandler.broadcast).toHaveBeenCalledWith('code:generated', expect.anything());

      // 4. Audit log was called
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent_action',
        }),
      );
    });

    it('should use stylePreset in system prompt when provided', async () => {
      const modelResponse: ModelResponse = {
        content: '```tsx path="src/App.tsx"\nexport default function App() { return <div>Elegant</div>; }\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: '生成页面',
        framework: 'react',
        stylePreset: 'elegant',
      };

      await generator.generate(request);

      const calledMessages = (gateway.chat as ReturnType<typeof vi.fn>).mock.calls[0][0] as ChatMessage[];
      const systemPrompt = calledMessages[0].content;
      // System prompt should mention the Elegant preset
      expect(systemPrompt).toContain('elegant');
      expect(systemPrompt).toContain('#1e293b');
    });
  });

  describe('parseCodeBlocks', () => {
    it('should correctly parse ```tsx path="src/App.tsx"``` format', () => {
      // We test parseCodeBlocks indirectly through generate()
      // by setting up a specific model response
      const modelResponse: ModelResponse = {
        content: '```tsx path="src/App.tsx"\nexport default function App() {\n  return <div>Hello</div>;\n}\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      // Access private method via testing — call generate and inspect results
      return generator.generate(request).then((files) => {
        expect(files.length).toBe(1);
        expect(files[0].filename).toBe('App.tsx');
        expect(files[0].path).toBe('src/App.tsx');
        expect(files[0].language).toBe('tsx');
        expect(files[0].framework).toBe('react');
        expect(files[0].content).toContain('export default function App');
      });
    });

    it('should auto-name code blocks without path annotation', () => {
      const modelResponse: ModelResponse = {
        content: '```tsx\nconst Component = () => <div>Test</div>;\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      return generator.generate(request).then((files) => {
        expect(files.length).toBe(1);
        // Auto-named files start with "file_1" pattern
        expect(files[0].filename).toMatch(/^file_/);
        expect(files[0].language).toBe('tsx');
      });
    });

    it('should return empty array for response with no code blocks', () => {
      const modelResponse: ModelResponse = {
        content: 'I cannot generate code for this request. Please provide more details.',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      return generator.generate(request).then((files) => {
        expect(files.length).toBe(0);
      });
    });

    it('should parse colon-separated path format', () => {
      const modelResponse: ModelResponse = {
        content: '```tsx:src/components/Button.tsx\nexport function Button() { return <button>Click</button>; }\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      return generator.generate(request).then((files) => {
        expect(files.length).toBe(1);
        expect(files[0].path).toBe('src/components/Button.tsx');
        expect(files[0].filename).toBe('Button.tsx');
      });
    });

    it('should parse multiple code blocks in one response', () => {
      const modelResponse: ModelResponse = {
        content: `Here are the files:

\`\`\`tsx path="src/App.tsx"
export default function App() { return <div>Main</div>; }
\`\`\`

\`\`\`css path="src/App.css"
.app { margin: 16px; }
\`\`\`

\`\`\`json path="package.json"
{ "name": "my-app" }
\`\`\``,
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      return generator.generate(request).then((files) => {
        expect(files.length).toBe(3);
        expect(files[0].path).toBe('src/App.tsx');
        expect(files[1].path).toBe('src/App.css');
        expect(files[2].path).toBe('package.json');
      });
    });
  });

  describe('applyAesthetic', () => {
    it('should add aesthetic reminder comment for files without 8px grid spacing', () => {
      const modelResponse: ModelResponse = {
        content: '```css path="src/styles.css"\nbody { color: red; }\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'html',
      };

      return generator.generate(request).then((files) => {
        // CSS file without 8px grid spacing should get a reminder
        expect(files[0].content).toContain('审美提醒');
        expect(files[0].content).toContain('8px 网格间距');
      });
    });

    it('should not add reminder for files that already use 8px grid spacing', () => {
      const modelResponse: ModelResponse = {
        content: '```tsx path="src/App.tsx"\nexport default function App() { return <div className="p-8 m-16 gap-4">Hello</div>; }\n```',
        tokenUsage: { prompt: 50, completion: 100, total: 150 },
        model: 'gpt-4o',
        provider: 'openai',
      };
      (gateway.chat as ReturnType<typeof vi.fn>).mockResolvedValue(modelResponse);

      const request: CodeGenRequest = {
        prompt: 'test',
        framework: 'react',
      };

      return generator.generate(request).then((files) => {
        // React file with Tailwind gap classes should NOT get a reminder
        expect(files[0].content).not.toContain('审美提醒');
      });
    });
  });

  describe('getPreviewEngine', () => {
    it('should return the PreviewEngine instance', () => {
      const preview = generator.getPreviewEngine();
      expect(preview).toBe(previewEngine);
    });
  });
});
