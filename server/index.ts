import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { initDatabase, closeDatabase, getDb } from './db/database';
import router from './routes';
import { WebSocketHandler } from './ws/WebSocketHandler';
import { ModelGateway } from './gateway/ModelGateway';
import { OpenAIProvider } from './gateway/providers/OpenAIProvider';
import { AnthropicProvider } from './gateway/providers/AnthropicProvider';
import { OllamaProvider } from './gateway/providers/OllamaProvider';
import { MemoryStore } from './memory/MemoryStore';
import { AuditLogger } from './memory/AuditLogger';
import { AgentManager } from './agents/AgentManager';
import { WorkflowEngine } from './orchestrator/WorkflowEngine';
import { TaskScheduler } from './orchestrator/TaskScheduler';
import { initContainer, setCodeGenerator } from './services/container';
import { DEFAULT_MODEL_CONFIG } from '../shared/constants';
import { AestheticEngine } from './codegen/AestheticEngine';
import { PreviewEngine } from './codegen/PreviewEngine';
import { CodeGenerator } from './codegen/CodeGenerator';
import type { ModelConfig, InterventionAction } from '../shared/types';

// Async server startup
async function startServer(): Promise<void> {
  // Initialize database before starting the server
  await initDatabase();

  const app = express();

  // Middleware
  const corsOrigin = config.isDev ? 'http://localhost:5173' : false;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());

  // Health check route
  app.get('/api/health', (_req, res) => {
    res.json({ code: 0, data: { status: 'ok' }, message: 'success' });
  });

  // API routes (including taskRoutes via container - lazy initialization)
  app.use('/api', router);

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Create WebSocketHandler (replaces basic wss.on('connection') handler)
  const wsHandler = new WebSocketHandler(wss);

  // Create memory and audit services
  const auditLogger = new AuditLogger(getDb());
  const memoryStore = new MemoryStore(getDb());

  // Load model configuration from settings table
  function loadModelConfig(): ModelConfig {
    const row = getDb()
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('model') as { value: string } | undefined;

    if (row?.value) {
      try {
        return JSON.parse(row.value) as ModelConfig;
      } catch {
        // ignore parse error
      }
    }
    return DEFAULT_MODEL_CONFIG;
  }

  const modelConfig = loadModelConfig();
  const gateway = new ModelGateway(modelConfig, auditLogger, wsHandler);
  gateway.registerProvider('openai', new OpenAIProvider());
  gateway.registerProvider('anthropic', new AnthropicProvider());
  gateway.registerProvider('ollama', new OllamaProvider());

  const agentManager = new AgentManager(gateway, memoryStore, auditLogger, wsHandler);
  const workflowEngine = new WorkflowEngine(agentManager, auditLogger, wsHandler);
  const taskScheduler = new TaskScheduler(agentManager, workflowEngine, auditLogger, wsHandler);

  // Initialize container
  initContainer(taskScheduler);

  // Create code generator
  const aestheticEngine = new AestheticEngine();
  const previewEngine = new PreviewEngine();
  const codeGenerator = new CodeGenerator(gateway, aestheticEngine, previewEngine, wsHandler, auditLogger);
  setCodeGenerator(codeGenerator);

  // WebSocket message handler
  wsHandler.onMessage((_ws, event) => {
    try {
      if (event.type === 'intervention:requested') {
        const { taskId, action } = event.payload as { taskId: string; action: InterventionAction };
        taskScheduler.intervene(taskId, action).catch((err) => {
          logger.error('WebSocket', `Failed to handle intervention: ${err}`);
        });
      }
    } catch (err) {
      logger.error('WebSocket', `Failed to handle message: ${err}`);
    }
  });

  // ============== End Service Initialization ==============

  // Start server
  server.listen(config.port, () => {
    logger.info('Server', `EvoCode server running on http://localhost:${config.port}`);
    logger.info('Server', `WebSocket server listening on ws://localhost:${config.port}/ws`);
    logger.info('Server', `Environment: ${config.isDev ? 'development' : 'production'}`);
  });
}

// Call the async server start
startServer().catch((err) => {
  logger.error('Server', `Failed to start server: ${err}`);
  process.exit(1);
});

// Graceful shutdown — close database connection on process termination
process.on('SIGINT', () => {
  logger.info('Server', 'SIGINT received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Server', 'SIGTERM received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

export { app, server, wss };
