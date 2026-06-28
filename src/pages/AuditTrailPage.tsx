import { useState, useEffect, useCallback } from 'react'
import { History, Loader2, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/apiClient'
import { useKanbanStore } from '@/stores/kanbanStore'
import { formatTime, cn } from '@/lib/utils'
import { AGENT_ROLE_LABELS } from '@shared/constants'
import type { AuditLog, AuditEventType } from '@shared/types'

const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  agent_action: 'Agent 动作',
  human_intervention: '人工干预',
  model_switch: '模型切换',
  task_event: '任务事件',
  review: '审查',
}

const EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
  agent_action: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  human_intervention: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  model_switch: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  task_event: 'bg-green-500/10 text-green-600 dark:text-green-400',
  review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
}

const EVENT_TYPES: AuditEventType[] = [
  'agent_action',
  'human_intervention',
  'model_switch',
  'task_event',
  'review',
]

function AuditTrailPage() {
  const agents = useKanbanStore((s) => s.agents)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [filterEventType, setFilterEventType] = useState<AuditEventType | 'all'>('all')
  const [filterAgentId, setFilterAgentId] = useState<string>('all')
  const [filterTaskId, setFilterTaskId] = useState<string>('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<AuditLog[]>('/api/audit')
      setLogs(data)
    } catch {
      // API not available yet; show empty state
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const filteredLogs = logs.filter((log) => {
    if (filterEventType !== 'all' && log.eventType !== filterEventType) return false
    if (filterAgentId !== 'all' && log.agentId !== filterAgentId) return false
    if (filterTaskId && !log.taskId.includes(filterTaskId.trim())) return false
    return true
  })

  const handleReset = (): void => {
    setFilterEventType('all')
    setFilterAgentId('all')
    setFilterTaskId('')
  }

  return (
    <div className="h-full p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">审计日志</h2>
        <p className="text-sm text-muted-foreground">查看系统事件、Agent 动作和人工干预记录</p>
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选
          </div>

          {/* Event type filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">事件类型</label>
            <Select
              value={filterEventType}
              onValueChange={(v) => setFilterEventType(v as AuditEventType | 'all')}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Agent</label>
            <Select value={filterAgentId} onValueChange={setFilterAgentId}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {AGENT_ROLE_LABELS[agent.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task ID filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">任务 ID</label>
            <Input
              value={filterTaskId}
              onChange={(e) => setFilterTaskId(e.target.value)}
              placeholder="搜索任务 ID"
              className="h-9 w-[180px]"
            />
          </div>

          <Button variant="outline" size="sm" className="h-9" onClick={handleReset}>
            重置
          </Button>

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredLogs.length} 条记录
          </span>
        </CardContent>
      </Card>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">暂无审计日志</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="relative pl-8">
            {/* Vertical timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const agent = agents.find((a) => a.id === log.agentId)
                return (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute -left-[22px] top-3 h-3 w-3 rounded-full border-2 border-card',
                        EVENT_TYPE_COLORS[log.eventType].split(' ')[0],
                      )}
                    />

                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn('text-xs', EVENT_TYPE_COLORS[log.eventType])}
                              >
                                {EVENT_TYPE_LABELS[log.eventType]}
                              </Badge>
                              {agent && (
                                <Badge variant="secondary" className="text-xs">
                                  {AGENT_ROLE_LABELS[agent.role]}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatTime(log.timestamp)}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm">{log.description}</p>
                            {log.taskId && (
                              <p className="mt-1 text-xs text-muted-foreground/60">
                                任务: {log.taskId}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default AuditTrailPage
