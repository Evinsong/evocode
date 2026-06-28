import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentCard } from '@/components/workspace/AgentCard'
import { useKanbanStore } from '@/stores/kanbanStore'
import { AGENT_ROLE_LABELS } from '@shared/constants'

export function KanbanBoard() {
  const agents = useKanbanStore((s) => s.agents)
  const taskProgress = useKanbanStore((s) => s.taskProgress)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">协作看板</h3>
          <span className="text-xs text-muted-foreground">{agents.length} Agents</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={taskProgress} className="h-2 flex-1" />
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {taskProgress}%
          </span>
        </div>
      </div>

      {/* Agent cards */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="shrink-0 border-t p-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {Object.entries(AGENT_ROLE_LABELS).map(([role, label]) => (
            <span key={role} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
