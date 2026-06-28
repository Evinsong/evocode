import { randomUUID } from 'node:crypto';
import type {
  ChatMessage,
  CodeGenRequest,
  CodeFramework,
  GeneratedFile,
} from '../../shared/types';
import type { ModelGateway } from '../gateway/ModelGateway';
import type { AuditLogger } from '../memory/AuditLogger';
import type { WebSocketHandler } from '../ws/WebSocketHandler';
import { AestheticEngine } from './AestheticEngine';
import { PreviewEngine } from './PreviewEngine';
import { getDb, saveDatabase } from '../db/database';
import { logger } from '../lib/logger';

/**
 * CodeGenerator is the core engine that transforms natural language prompts
 * into structured code files via an LLM, with aesthetic design standards
 * injected into the generation process.
 *
 * Flow:
 * 1. Inject aesthetic standards into the user prompt
 * 2. Build ChatMessage[] with system + user prompts
 * 3. Call ModelGateway.chat() to get the LLM response
 * 4. Parse code blocks from the response
 * 5. Apply aesthetic post-check to generated files
 * 6. Save files to the generated_files database table
 * 7. Broadcast code:generated via WebSocket
 * 8. Log the generation event via AuditLogger
 */
export class CodeGenerator {
  private gateway: ModelGateway;
  private aestheticEngine: AestheticEngine;
  private previewEngine: PreviewEngine;
  private wsHandler: WebSocketHandler;
  private auditLogger: AuditLogger;

  constructor(
    gateway: ModelGateway,
    aestheticEngine: AestheticEngine,
    previewEngine: PreviewEngine,
    wsHandler: WebSocketHandler,
    auditLogger: AuditLogger,
  ) {
    this.gateway = gateway;
    this.aestheticEngine = aestheticEngine;
    this.previewEngine = previewEngine;
    this.wsHandler = wsHandler;
    this.auditLogger = auditLogger;
  }

  /**
   * Generate code files from a natural language prompt.
   * @param request - CodeGenRequest with prompt, framework, and optional style preset
   * @returns Array of GeneratedFile objects parsed from the model response
   */
  async generate(request: CodeGenRequest): Promise<GeneratedFile[]> {
    logger.info('CodeGenerator', `Starting generation: framework=${request.framework}`);

    // Step 1: Inject aesthetic standards into user prompt
    const injectedPrompt = this.aestheticEngine.injectPrompt(request.prompt);

    // Step 2: Build messages array
    const systemPrompt = this.buildSystemPrompt(request.framework, request.stylePreset);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: injectedPrompt },
    ];

    // Step 3: Call LLM via ModelGateway
    const response = await this.gateway.chat(messages);
    logger.info('CodeGenerator', `LLM response received: ${response.content.length} chars`);

    // Step 4: Parse code blocks from response
    const files = this.parseCodeBlocks(response.content, request.framework, request.projectId);

    // Step 5: Apply aesthetic post-check
    const checkedFiles = this.applyAesthetic(files);

    // Step 6: Save to database
    this.saveFiles(checkedFiles, request.projectId);

    // Step 7: Broadcast WebSocket event
    this.wsHandler.broadcast('code:generated', {
      files: checkedFiles,
      framework: request.framework,
      prompt: request.prompt,
    });

    // Step 8: Audit log
    this.auditLogger.log({
      taskId: request.projectId ?? 'standalone',
      agentId: null,
      eventType: 'agent_action',
      description: `Code generation completed: ${checkedFiles.length} files generated for framework ${request.framework}`,
      details: {
        framework: request.framework,
        fileCount: checkedFiles.length,
        filenames: checkedFiles.map((f) => f.filename),
        model: response.model,
        tokenUsage: response.tokenUsage,
      },
    });

    logger.info('CodeGenerator', `Generation complete: ${checkedFiles.length} files`);
    return checkedFiles;
  }

  /**
   * Get the PreviewEngine instance for building preview HTML.
   * @returns The PreviewEngine used by this generator
   */
  getPreviewEngine(): PreviewEngine {
    return this.previewEngine;
  }

  /**
   * Build the system prompt for code generation.
   * Incorporates the framework type and optional theme preset.
   * Optimized for precision: explicit rules, clear constraints, minimal ambiguity.
   */
  private buildSystemPrompt(
    framework: CodeFramework,
    stylePreset?: string,
  ): string {
    const frameworkLabel = this.getFrameworkLabel(framework);
    let prompt = `You are a senior full-stack developer specializing in ${frameworkLabel}.

## CRITICAL OUTPUT RULES (Must Follow Exactly)

### 1. File Path Format (MANDATORY)
Every code block MUST include the path in this EXACT format:
\`\`\`language path="src/filename.${this.getFrameworkExtension(framework)}"
your code here
\`\`\`
⚠️ DO NOT use colon format (lang:path). Use ONLY path="..." attribute.

### 2. Code Completeness (MANDATORY)
- NO placeholders like "// TODO: implement..." or "/* Add your code here */"
- NO incomplete functions or classes
- Every file must be fully functional and copy-paste ready

### 3. Type Safety (MANDATORY for TypeScript/TSX)
- All variables must have explicit type annotations
- Use interfaces for data structures
- Avoid 'any' type - use 'unknown' if type is uncertain

## Code Style Guidelines

### Required Conventions
- Use meaningful variable/function names in English
- Add JSDoc comments for all exported functions and classes
- Follow standard naming: camelCase (variables/functions), PascalCase (components/classes), SCREAMING_SNAKE_CASE (constants)

### Modern Best Practices
- Use functional components with hooks (React)
- Prefer composition over inheritance
- Implement proper error handling with try-catch
- Use async/await for asynchronous operations`;

    // Inject theme preset if specified
    if (stylePreset) {
      const preset = this.aestheticEngine.getThemePreset(stylePreset);
      if (preset) {
        prompt += `\n\n## 主题预设：${preset.name}
${preset.description}
- 主色：${preset.colors.primary}
- 辅色：${preset.colors.secondary}
- 强调色：${preset.colors.accent}
- 背景：${preset.colors.background}
- 文字：${preset.colors.foreground}
- 字体：${preset.typography.fontFamily}`;
        if (preset.typography.headingFont) {
          prompt += `\n- 标题字体：${preset.typography.headingFont}`;
        }
      }
    }

    return prompt;
  }

  /**
   * Get a human-readable label for a code framework.
   */
  private getFrameworkLabel(framework: CodeFramework): string {
    const labels: Record<CodeFramework, string> = {
      react: 'React',
      vue: 'Vue',
      html: 'HTML/CSS/JS',
    };
    return labels[framework] ?? framework;
  }

  /**
   * Get the primary file extension for a framework.
   */
  private getFrameworkExtension(framework: CodeFramework): string {
    const exts: Record<CodeFramework, string> = {
      react: 'tsx',
      vue: 'vue',
      html: 'html',
    };
    return exts[framework] ?? 'txt';
  }

  /**
   * Parse code blocks from an LLM response string.
   *
   * Supported formats:
   * - ```language path="filename"``` — preferred format with explicit path
   * - ```language:filename``` — alternative colon-separated format
   * - ```language``` — fallback; filename is auto-generated
   *
   * @param response - Raw LLM response text
   * @param framework - Target code framework for the files
   * @param taskId - Optional project/task ID to associate files with
   * @returns Array of GeneratedFile objects
   */
  private parseCodeBlocks(
    response: string,
    framework: CodeFramework,
    taskId?: string,
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Regex: match ```lang path="filepath"``` or ```lang:filepath``` or ```lang```
    // Group 1: language, Group 2: path="..." value (optional), Group 3: :filepath value (optional)
    const codeBlockRegex = /```(\w+)(?:\s+path="([^"]+)")?(?:\s*:([^\n]+))?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;
    let unnamedIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] ?? 'text';
      const pathFromAttr = match[2]; // from path="..."
      const pathFromColon = match[3]; // from :filename
      const content = match[4] ?? '';

      // Determine filename and path
      let filename: string;
      let filePath: string;

      if (pathFromAttr) {
        // Format: ```tsx path="src/App.tsx"
        filePath = pathFromAttr;
        filename = pathFromAttr.split('/').pop() ?? pathFromAttr;
      } else if (pathFromColon) {
        // Format: ```tsx:src/App.tsx
        filePath = pathFromColon.trim();
        filename = filePath.split('/').pop() ?? filePath;
      } else {
        // No path specified — auto-generate filename
        unnamedIndex++;
        const ext = this.languageToExtension(language, framework);
        filename = `file_${unnamedIndex}${ext}`;
        filePath = filename;
      }

      // Normalize language label
      const normalizedLang = this.normalizeLanguage(language);

      files.push({
        id: randomUUID(),
        taskId: taskId ?? 'standalone',
        filename,
        path: filePath,
        content: content.trimEnd(),
        language: normalizedLang,
        framework,
      });
    }

    return files;
  }

  /**
   * Apply aesthetic post-check to generated files.
   * Scans each file's content for compliance with design standards
   * and adds inline comments noting any missing standards.
   *
   * Current checks:
   * - If CSS/HTML content doesn't use 8px grid spacing, add a comment
   *
   * @param files - Generated files to check
   * @returns The same files, potentially annotated with aesthetic comments
   */
  private applyAesthetic(files: GeneratedFile[]): GeneratedFile[] {
    return files.map((file) => {
      const content = file.content;

      // Check for 8px grid usage in style-bearing files
      const isStyleFile =
        file.language === 'css' ||
        file.language === 'html' ||
        file.language === 'tsx' ||
        file.language === 'jsx' ||
        file.language === 'vue';

      if (isStyleFile && content.length > 0) {
        // Look for padding/margin values that are NOT multiples of 8
        // (simple heuristic — if no 8-based spacing pattern is found, note it)
        const hasGridSpacing =
          content.includes('8px') ||
          content.includes('16px') ||
          content.includes('24px') ||
          content.includes('32px') ||
          content.includes('gap-') ||
          content.includes('p-') ||
          content.includes('m-');

        if (!hasGridSpacing) {
          // Add an aesthetic reminder comment at the top
          const reminder = '/* [审美提醒] 未检测到 8px 网格间距系统，请确保所有间距使用 8 的倍数 */\n';
          return {
            ...file,
            content: reminder + content,
          };
        }
      }

      return file;
    });
  }

  /**
   * Save generated files to the database.
   * Inserts each file into the generated_files table.
   */
  private saveFiles(files: GeneratedFile[], taskId?: string): void {
    const db = getDb();

    // Use sql.js transaction for atomic batch insert
    db.run('BEGIN TRANSACTION');
    try {
      const insert = db.prepare(
        `INSERT INTO generated_files (id, task_id, filename, path, content, language, framework, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const now = Date.now();
      for (const file of files) {
        insert.run(
          file.id,
          file.taskId ?? taskId ?? 'standalone',
          file.filename,
          file.path,
          file.content,
          file.language,
          file.framework,
          now,
        );
      }

      db.run('COMMIT');
      saveDatabase();
      logger.info('CodeGenerator', `Saved ${files.length} files to database`);
    } catch (err) {
      db.run('ROLLBACK');
      logger.error('CodeGenerator', `Failed to save files: ${err}`);
      throw err;
    }
  }

  /**
   * Normalize a language label from code block markers.
   * e.g. "typescript" → "typescript", "tsx" → "tsx", "js" → "javascript"
   */
  private normalizeLanguage(lang: string): string {
    const map: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      sh: 'shell',
      bash: 'shell',
      yml: 'yaml',
      toml: 'toml',
      json: 'json',
      md: 'markdown',
    };
    return map[lang.toLowerCase()] ?? lang.toLowerCase();
  }

  /**
   * Map a language label to a file extension based on framework context.
   */
  private languageToExtension(language: string, framework: CodeFramework): string {
    const lang = language.toLowerCase();

    // Framework-specific defaults
    if (framework === 'react') {
      if (lang === 'typescript' || lang === 'ts') return '.tsx';
      if (lang === 'javascript' || lang === 'js') return '.jsx';
    }
    if (framework === 'vue') {
      return '.vue';
    }

    // Language-specific defaults
    const map: Record<string, string> = {
      typescript: '.ts',
      ts: '.ts',
      tsx: '.tsx',
      javascript: '.js',
      js: '.js',
      jsx: '.jsx',
      css: '.css',
      html: '.html',
      python: '.py',
      json: '.json',
      yaml: '.yaml',
      markdown: '.md',
      shell: '.sh',
    };

    return map[lang] ?? `.${lang}`;
  }
}
