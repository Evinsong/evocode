import { useState } from 'react'
import { Download, FileCode2, Eye, Code2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeEditor } from '@/components/workspace/CodeEditor'
import { PreviewFrame } from '@/components/workspace/PreviewFrame'
import { useCodePreview } from '@/hooks/useCodePreview'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function CodePreviewPanel() {
  const { files, activeFile, activeHtml, selectFile, selectedFileIndex } = useCodePreview()
  const theme = useSettingsStore((s) => s.theme)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>('code')

  const handleExport = (): void => {
    if (!activeFile) return

    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({ title: '导出成功', description: `已下载 ${activeFile.filename}` })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs header */}
      <div className="shrink-0 border-b p-2">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="h-8">
                <TabsTrigger value="code" className="text-xs">
                  <Code2 className="mr-1.5 h-3.5 w-3.5" />
                  代码
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  预览
                </TabsTrigger>
              </TabsList>

              {activeFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleExport}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  导出
                </Button>
              )}
            </div>

            {/* Code tab */}
            <TabsContent value="code" className="mt-0">
              <div className="h-[calc(100vh-12rem)] xl:h-[calc(100vh-14rem)]">
                {activeFile ? (
                  <CodeEditor
                    value={activeFile.content}
                    language={activeFile.language}
                    theme={theme}
                  />
                ) : (
                  <EmptyState />
                )}
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="mt-0">
              <div className="h-[calc(100vh-12rem)] xl:h-[calc(100vh-14rem)] overflow-hidden rounded-lg border">
                <PreviewFrame htmlContent={activeHtml} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* File list (if multiple files) */}
      {files.length > 1 && (
        <div className="shrink-0 border-t">
          <ScrollArea className="h-auto max-h-32">
            <div className="flex flex-wrap gap-1 p-2">
              {files.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => selectFile(index)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                    index === selectedFileIndex
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{file.filename}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <FileCode2 className="mb-3 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">暂无生成代码</p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        在对话面板中描述需求以生成代码
      </p>
    </div>
  )
}
