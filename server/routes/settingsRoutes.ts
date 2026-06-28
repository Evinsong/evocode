import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database';
import { config } from '../lib/config';
import { encrypt } from '../lib/crypto';
import { logger } from '../lib/logger';
import { DEFAULT_MODEL_CONFIG } from '../../shared/constants';
import type {
  ApiResponse,
  AppSettings,
  CodeFramework,
  ModelConfig,
} from '../../shared/types';

const router = Router();

/** Setting keys used in the settings table */
const SETTING_KEYS = {
  MODEL: 'model',
  THEME: 'theme',
  LANGUAGE: 'language',
  STORAGE: 'storage',
  DEFAULT_FRAMEWORK: 'defaultFramework',
} as const;

/** Default app settings used when no settings exist in the database */
const DEFAULT_SETTINGS: AppSettings = {
  model: {
    ...DEFAULT_MODEL_CONFIG,
  } as ModelConfig,
  theme: 'dark',
  language: 'zh',
  storage: { type: 'local', path: './data' },
  defaultFramework: 'react',
};

/**
 * Read a setting value from the database.
 * @param key - Setting key
 * @returns Setting value string or null if not found
 */
function readSetting(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

/**
 * Write a setting value to the database (upsert).
 * @param key - Setting key
 * @param value - Setting value
 */
function writeSetting(key: string, value: string): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, now);
}

/**
 * Load all settings from the database and assemble into an AppSettings object.
 * If a setting is missing, falls back to defaults.
 * @returns Assembled AppSettings object
 */
function loadSettings(): AppSettings {
  // Load model config
  const modelJson = readSetting(SETTING_KEYS.MODEL);
  let model: ModelConfig = { ...DEFAULT_SETTINGS.model };

  if (modelJson) {
    try {
      model = JSON.parse(modelJson) as ModelConfig;
    } catch {
      logger.warn('Settings', `Failed to parse model config JSON, using defaults`);
    }
  }

  // Load theme
  const theme = (readSetting(SETTING_KEYS.THEME) as AppSettings['theme']) ?? DEFAULT_SETTINGS.theme;

  // Load language
  const language = (readSetting(SETTING_KEYS.LANGUAGE) as AppSettings['language']) ?? DEFAULT_SETTINGS.language;

  // Load storage
  const storageJson = readSetting(SETTING_KEYS.STORAGE);
  let storage = DEFAULT_SETTINGS.storage;
  if (storageJson) {
    try {
      storage = JSON.parse(storageJson);
    } catch {
      logger.warn('Settings', `Failed to parse storage JSON, using defaults`);
    }
  }

  // Load default framework
  const defaultFramework =
    (readSetting(SETTING_KEYS.DEFAULT_FRAMEWORK) as CodeFramework) ?? DEFAULT_SETTINGS.defaultFramework;

  return { model, theme, language, storage, defaultFramework };
}

/**
 * Build a safe response object for settings.
 * Replaces the encrypted apiKey with a boolean hasApiKey flag.
 * @param settings - Full AppSettings from database
 * @returns Safe settings object for API response
 */
function buildSafeSettings(settings: AppSettings): Record<string, unknown> {
  const { apiKey, ...modelWithoutKey } = settings.model;
  const hasApiKey = !!(apiKey && apiKey.length > 0);

  return {
    ...settings,
    model: {
      ...modelWithoutKey,
      hasApiKey,
    },
  };
}

/**
 * GET /api/settings
 * Returns current application settings.
 * The model.apiKey is not returned in plaintext — only a hasApiKey boolean flag.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const safeSettings = buildSafeSettings(settings);

    const response: ApiResponse<typeof safeSettings> = {
      code: 0,
      data: safeSettings,
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
 * PUT /api/settings
 * Update application settings.
 * If model.apiKey is provided and non-empty, it is encrypted before storage.
 * If model.apiKey is empty or omitted, the existing encrypted key is preserved.
 * Body: Partial or full AppSettings object
 */
router.put('/', (req: Request, res: Response) => {
  try {
    const current = loadSettings();
    const body = req.body as Partial<AppSettings>;

    // Handle model config update
    if (body.model) {
      const newModel: ModelConfig = { ...current.model, ...body.model };

      // Handle apiKey: encrypt if provided, preserve existing if omitted
      if (body.model.apiKey !== undefined) {
        if (body.model.apiKey.length > 0) {
          // New API key provided — encrypt and store
          if (config.encryptionKey) {
            newModel.apiKey = encrypt(body.model.apiKey, config.encryptionKey);
            logger.info('Settings', 'API key updated and encrypted');
          } else {
            logger.warn('Settings', 'No encryption key configured, storing API key in plaintext');
            newModel.apiKey = body.model.apiKey;
          }
        } else {
          // Empty apiKey means clear the key
          newModel.apiKey = undefined;
          logger.info('Settings', 'API key cleared');
        }
      }
      // If apiKey was omitted in the request, newModel.apiKey retains current (encrypted) value

      writeSetting(SETTING_KEYS.MODEL, JSON.stringify(newModel));
    }

    // Handle theme update
    if (body.theme) {
      writeSetting(SETTING_KEYS.THEME, body.theme);
    }

    // Handle language update
    if (body.language) {
      writeSetting(SETTING_KEYS.LANGUAGE, body.language);
    }

    // Handle storage update
    if (body.storage) {
      writeSetting(SETTING_KEYS.STORAGE, JSON.stringify(body.storage));
    }

    // Handle defaultFramework update
    if (body.defaultFramework) {
      writeSetting(SETTING_KEYS.DEFAULT_FRAMEWORK, body.defaultFramework);
    }

    // Reload and return safe settings
    const updated = loadSettings();
    const safeSettings = buildSafeSettings(updated);

    const response: ApiResponse<typeof safeSettings> = {
      code: 0,
      data: safeSettings,
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
