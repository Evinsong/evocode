import { Router, type Request, type Response } from 'express';
import { getCodeGenerator } from '../services/container';
import { getDb } from '../db/database';
import type {
  ApiResponse,
  CodeFramework,
  CodeGenRequest,
  GeneratedFile,
} from '../../shared/types';

const router = Router();

/**
 * POST /generate
 * Generate code from a natural language prompt.
 * Body: { prompt: string, framework: CodeFramework, stylePreset?: string, projectId?: string }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, framework, stylePreset, projectId } = req.body as {
      prompt: string;
      framework: string;
      stylePreset?: string;
      projectId?: string;
    };

    if (!prompt || !framework) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required fields: prompt, framework',
      };
      res.status(400).json(response);
      return;
    }

    // Validate framework value
    const validFrameworks: CodeFramework[] = ['react', 'vue', 'html'];
    if (!validFrameworks.includes(framework as CodeFramework)) {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: `Invalid framework: ${framework}. Valid values: ${validFrameworks.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    const generator = getCodeGenerator();
    const request: CodeGenRequest = {
      prompt,
      framework: framework as CodeFramework,
      stylePreset,
      projectId,
    };

    const files = await generator.generate(request);

    const response: ApiResponse<GeneratedFile[]> = {
      code: 0,
      data: files,
      message: 'success',
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * POST /preview
 * Build a preview HTML page from generated files.
 * Body: { files: GeneratedFile[] } or { taskId: string }
 */
router.post('/preview', (req: Request, res: Response) => {
  try {
    const { files, taskId } = req.body as {
      files?: GeneratedFile[];
      taskId?: string;
    };

    const generator = getCodeGenerator();
    const previewEngine = generator.getPreviewEngine();

    let resolvedFiles: GeneratedFile[];

    if (files && Array.isArray(files)) {
      resolvedFiles = files;
    } else if (taskId) {
      // Load files from database by task ID
      const db = getDb();
      const rows = db
        .prepare('SELECT * FROM generated_files WHERE task_id = ?')
        .all(taskId) as Array<{
        id: string;
        task_id: string;
        filename: string;
        path: string;
        content: string;
        language: string;
        framework: string;
        created_at: number;
      }>;

      resolvedFiles = rows.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        filename: row.filename,
        path: row.path,
        content: row.content,
        language: row.language,
        framework: row.framework as CodeFramework,
      }));
    } else {
      const response: ApiResponse<null> = {
        code: 400,
        data: null,
        message: 'Missing required fields: files or taskId',
      };
      res.status(400).json(response);
      return;
    }

    const html = previewEngine.buildPreview(resolvedFiles);

    const response: ApiResponse<string> = {
      code: 0,
      data: html,
      message: 'success',
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

/**
 * GET /export/:taskId
 * Export all generated files for a given task.
 */
router.get('/export/:taskId', (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const db = getDb();

    const rows = db
      .prepare('SELECT * FROM generated_files WHERE task_id = ?')
      .all(taskId) as Array<{
      id: string;
      task_id: string;
      filename: string;
      path: string;
      content: string;
      language: string;
      framework: string;
      created_at: number;
    }>;

    if (rows.length === 0) {
      const response: ApiResponse<null> = {
        code: 404,
        data: null,
        message: `No generated files found for task: ${taskId}`,
      };
      res.status(404).json(response);
      return;
    }

    const files: GeneratedFile[] = rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      filename: row.filename,
      path: row.path,
      content: row.content,
      language: row.language,
      framework: row.framework as CodeFramework,
    }));

    const response: ApiResponse<GeneratedFile[]> = {
      code: 0,
      data: files,
      message: 'success',
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<null> = { code: 500, data: null, message };
    res.status(500).json(response);
  }
});

export default router;
