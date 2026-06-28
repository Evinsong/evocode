import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  value: string
  language: string
  onChange?: (value: string) => void
  theme?: 'dark' | 'light'
}

/**
 * Monaco Editor wrapper component with syntax highlighting and code folding.
 * Theme follows the application theme (dark/light).
 */
export function CodeEditor({
  value,
  language,
  onChange,
  theme = 'dark',
}: CodeEditorProps) {
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  const handleChange = (val: string | undefined): void => {
    onChange?.(val ?? '')
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        language={normalizeLanguage(language)}
        value={value}
        onChange={handleChange}
        theme={monacoTheme}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
          renderLineHighlight: 'all',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  )
}

/**
 * Normalize language identifiers to Monaco-compatible names.
 */
function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase()
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    'text/typescript': 'typescript',
    'text/javascript': 'javascript',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
  }
  return map[lower] ?? lower
}
