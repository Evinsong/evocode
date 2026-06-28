import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

// Mock matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock URL.createObjectURL (not available in jsdom)
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockReturnValue('mock-url'),
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
})

// Mock Monaco Editor (loads from CDN, not available in test env)
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) =>
    React.createElement('textarea', {
      'data-testid': 'monaco-editor',
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
    }),
}))
