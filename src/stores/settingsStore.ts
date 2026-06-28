import { create } from 'zustand'
import type { ModelConfig, AppSettings } from '@shared/types'
import { DEFAULT_MODEL_CONFIG } from '@shared/constants'
import { apiClient } from '@/services/apiClient'

/**
 * Apply the theme class to the document root element.
 */
function applyTheme(theme: 'dark' | 'light'): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface SettingsState {
  model: ModelConfig
  theme: 'dark' | 'light'
  language: 'zh' | 'en'
  hasApiKey: boolean
  storagePath: string
  setModel: (model: Partial<ModelConfig>) => void
  setTheme: (theme: 'dark' | 'light') => void
  setLanguage: (lang: 'zh' | 'en') => void
  setHasApiKey: (has: boolean) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  model: { ...DEFAULT_MODEL_CONFIG },
  theme: 'dark',
  language: 'zh',
  hasApiKey: false,
  storagePath: '',

  setModel: (model) =>
    set((state) => ({
      model: { ...state.model, ...model },
      hasApiKey: model.apiKey !== undefined ? !!model.apiKey : state.hasApiKey,
    })),

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  setLanguage: (language) => set({ language }),

  setHasApiKey: (hasApiKey) => set({ hasApiKey }),

  loadSettings: async () => {
    try {
      const data = await apiClient.get<AppSettings>('/api/settings')
      set({
        model: data.model,
        theme: data.theme,
        language: data.language,
        storagePath: data.storage?.path ?? '',
        hasApiKey: !!data.model.apiKey,
      })
      applyTheme(data.theme)
    } catch {
      // If settings API is not available yet, use defaults
      applyTheme(get().theme)
    }
  },

  saveSettings: async () => {
    const { model, theme, language, storagePath } = get()
    const settings: AppSettings = {
      model,
      theme,
      language,
      storage: { type: 'local', path: storagePath },
      defaultFramework: 'react',
    }
    await apiClient.put('/api/settings', settings)
  },
}))
