import { useTaskStore } from '@/stores/taskStore'
import type { GeneratedFile } from '@shared/types'

interface UseCodePreviewReturn {
  files: GeneratedFile[]
  activeFile: GeneratedFile | null
  activeHtml: string
  selectFile: (index: number) => void
  selectedFileIndex: number
}

/**
 * Hook for code preview functionality.
 * Provides the currently selected file and an assembled HTML preview string.
 */
export function useCodePreview(): UseCodePreviewReturn {
  const files = useTaskStore((state) => state.generatedFiles)
  const selectedFileIndex = useTaskStore((state) => state.selectedFileIndex)
  const selectFile = useTaskStore((state) => state.selectFile)

  const activeFile: GeneratedFile | null =
    files.length > 0 && selectedFileIndex < files.length
      ? files[selectedFileIndex]
      : null

  const activeHtml: string = buildPreviewHtml(activeFile)

  return {
    files,
    activeFile,
    activeHtml,
    selectFile,
    selectedFileIndex,
  }
}

/**
 * Assemble a full HTML document for iframe preview.
 * If the file is already HTML, use it directly.
 * For other frameworks (react/vue), wrap the content in a basic HTML shell.
 */
function buildPreviewHtml(file: GeneratedFile | null): string {
  if (!file) {
    return '<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#999;">暂无预览内容</body></html>'
  }

  if (file.framework === 'html' || file.language === 'html') {
    return file.content
  }

  // For non-HTML files, wrap in a code display shell
  const escapedContent = file.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; margin: 0; padding: 16px; background: #1e1e1e; color: #d4d4d4; }
pre { white-space: pre-wrap; word-break: break-all; }
</style>
</head>
<body>
<pre>${escapedContent}</pre>
</body>
</html>`
}
