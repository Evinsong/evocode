import { useNavigate } from 'react-router-dom'
import { Activity, Moon, Sun, Settings as SettingsIcon, WifiOff, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTaskStore } from '@/stores/taskStore'
import { useKanbanStore } from '@/stores/kanbanStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { PROVIDER_INFO, MODEL_PROVIDERS } from '@shared/constants'
import type { ModelProvider } from '@shared/types'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface HeaderProps {
  connected: boolean
}

export function Header({ connected }: HeaderProps) {
  const navigate = useNavigate()
  const currentTask = useTaskStore((s) => s.currentTask)
  const taskProgress = useKanbanStore((s) => s.taskProgress)
  const agents = useKanbanStore((s) => s.agents)
  const model = useSettingsStore((s) => s.model)
  const setModel = useSettingsStore((s) => s.setModel)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const activeAgentCount = agents.filter(
    (a) => a.status !== 'idle' && a.status !== 'completed',
  ).length

  const handleProviderChange = (value: string): void => {
    setModel({ provider: value as ModelProvider })
  }

  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-card px-4">
      {/* Left: Task info + progress */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {currentTask?.title || 'EvoCode 工作台'}
          </h2>
          {currentTask && (
            <div className="mt-1 flex items-center gap-2">
              <Progress value={taskProgress} className="h-1.5 w-32" />
              <span className="text-xs text-muted-foreground">{taskProgress}%</span>
            </div>
          )}
        </div>

        {/* Active agents badge */}
        {activeAgentCount > 0 && (
          <Badge variant="secondary" className="hidden md:flex shrink-0 items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>{activeAgentCount} 个活跃 Agent</span>
          </Badge>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Connection indicator */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 text-xs',
            connected ? 'text-green-500' : 'text-muted-foreground',
          )}
        >
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span className="hidden lg:inline">{connected ? '已连接' : '未连接'}</span>
        </div>

        {/* Model provider selector */}
        <Select value={model.provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_PROVIDERS.map((provider: ModelProvider) => (
              <SelectItem key={provider} value={provider}>
                {PROVIDER_INFO[provider].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Settings link */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(ROUTES.SETTINGS)}
          aria-label="设置"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
