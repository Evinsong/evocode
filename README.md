# EvoCode

多 Agent 智能编码助手 —— 通过需求分析、架构设计、编码、测试、审查五个 Agent 协作，将自然语言需求转化为可交付代码。

## 技术栈

- **前端**: React 18 + Vite + TailwindCSS + TypeScript
- **后端**: Express + sql.js (SQLite) + WebSocket
- **LLM**: OpenAI / Anthropic / Ollama (可热切换)

## 项目结构

```
evocode/
├── server/                 # 后端
│   ├── index.ts           # 服务入口
│   ├── agents/            # Agent 实现（需求/架构/编码/测试/审查）
│   ├── gateway/           # LLM 模型网关 + Provider 适配器
│   ├── orchestrator/      # 工作流引擎 + 任务调度器
│   ├── codegen/           # 代码生成 + 审美引擎 + 预览
│   ├── memory/            # 持久记忆 + 审计日志
│   ├── ws/                # WebSocket 处理器
│   ├── db/                # 数据库初始化 + Schema
│   ├── routes/            # API 路由
│   ├── lib/               # 工具函数（加密/配置/日志）
│   └── services/          # 依赖注入容器
├── src/                   # 前端 (React + Vite)
├── shared/                # 前后端共享类型和常量
├── tests/                 # 测试
└── data/                  # SQLite 数据库文件（gitignored）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入真实的加密密钥：

```bash
# 生成 64 字符 hex 密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将输出填入 `ENCRYPTION_KEY`。

### 3. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev:all
```

或分别启动：

```bash
# 后端 (端口 3000)
npm run dev:server

# 前端 (端口 5173)
npm run dev:client
```

### 4. 配置 LLM Provider

通过设置页面配置 API Key 和模型。支持：
- **OpenAI**: GPT-4o, GPT-4o-mini 等
- **Anthropic**: Claude Sonnet, Claude Haiku 等
- **Ollama**: 本地模型 (需本地运行 Ollama)

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/tasks` | 创建任务 |
| GET | `/api/tasks` | 获取所有任务 |
| GET | `/api/tasks/:id` | 获取单个任务 |
| POST | `/api/tasks/:id/start` | 启动任务 |
| POST | `/api/tasks/:id/intervene` | 人工干预（暂停/恢复/修改/取消） |
| GET | `/api/tasks/:id/steps` | 获取任务步骤 |

WebSocket 端点: `ws://localhost:3000/ws`

## 工作流

```
用户输入需求 → 需求分析 Agent → 架构设计 Agent → 编码 Agent → 测试 Agent → 审查 Agent → 交付代码
```

每个阶段支持人工干预：暂停、恢复、修改需求、拒绝、取消。

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## License

MIT
