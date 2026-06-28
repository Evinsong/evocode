import { useState, useEffect } from 'react'
import { Cpu, Palette, Database, Sun, Moon, Download, Trash2, Loader2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToast } from '@/components/ui/use-toast'
import { MODEL_PROVIDERS, PROVIDER_INFO } from '@shared/constants'
import type { ModelProvider } from '@shared/types'
import { cn } from '@/lib/utils'

function SettingsPage() {
  const model = useSettingsStore((s) => s.model)
  const setModel = useSettingsStore((s) => s.setModel)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const storagePath = useSettingsStore((s) => s.storagePath)
  const saveSettings = useSettingsStore((s) => s.saveSettings)
  const hasApiKey = useSettingsStore((s) => s.hasApiKey)
  const { toast } = useToast()

  const [saving, setSaving] = useState<boolean>(false)
  const [exporting, setExporting] = useState<boolean>(false)

  // Local state for temperature slider
  const [temperature, setTemperature] = useState<number>(model.temperature ?? 0.7)

  useEffect(() => {
    setTemperature(model.temperature ?? 0.7)
  }, [model.temperature])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setModel({ temperature })
    try {
      await saveSettings()
      toast({ title: '设置已保存' })
    } catch (err) {
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || ''}/api/settings/export`,
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'evocode-export.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast({ title: '数据已导出' })
      } else {
        toast({ title: '导出失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '导出失败', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const handleClearData = async (): Promise<void> => {
    if (!confirm('确定要清除所有本地数据吗？此操作不可撤销。')) return

    try {
      await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/settings`, {
        method: 'DELETE',
      })
      toast({ title: '数据已清除' })
    } catch {
      toast({ title: '清除失败', variant: 'destructive' })
    }
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold">设置</h2>
          <p className="text-sm text-muted-foreground">配置模型、外观和存储选项</p>
        </div>

        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">模型配置</CardTitle>
                <CardDescription>配置 AI 模型提供商和参数</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">提供商</label>
              <Select
                value={model.provider}
                onValueChange={(v) => setModel({ provider: v as ModelProvider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_PROVIDERS.map((provider: ModelProvider) => (
                    <SelectItem key={provider} value={provider}>
                      <div className="flex items-center gap-2">
                        <span>{PROVIDER_INFO[provider].name}</span>
                        {PROVIDER_INFO[provider].isLocal && (
                          <Badge variant="secondary" className="text-xs">
                            本地
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">模型名称</label>
              <Input
                value={model.model}
                onChange={(e) => setModel({ model: e.target.value })}
                placeholder="gpt-4o, claude-3-5-sonnet, llama3..."
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">API Key</label>
                {hasApiKey && (
                  <Badge variant="outline" className="gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    已配置
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                value={model.apiKey ?? ''}
                onChange={(e) => setModel({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Base URL</label>
              <Input
                value={model.baseUrl ?? ''}
                onChange={(e) => setModel({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">温度</label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>精确 (0.0)</span>
                <span>平衡 (1.0)</span>
                <span>创意 (2.0)</span>
              </div>
            </div>

            {/* Max tokens */}
            <div className="space-y-2">
              <label className="text-sm font-medium">最大 Token 数</label>
              <Input
                type="number"
                value={model.maxTokens ?? 4096}
                onChange={(e) => setModel({ maxTokens: parseInt(e.target.value, 10) || 4096 })}
                min="1"
                max="128000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">外观</CardTitle>
                <CardDescription>自定义界面主题和语言</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme */}
            <div className="space-y-2">
              <label className="text-sm font-medium">主题</label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  浅色
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  深色
                </Button>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium">语言</label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'zh' | 'en')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">存储</CardTitle>
                <CardDescription>管理本地数据和导出</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">本地存储路径</label>
              <div className="flex items-center gap-2">
                <Input
                  value={storagePath || './data/evocode.db'}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                导出数据
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearData}
                className={cn('gap-2 text-destructive hover:text-destructive')}
              >
                <Trash2 className="h-4 w-4" />
                清除数据
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-2 pb-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
