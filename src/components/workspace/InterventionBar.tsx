import { Pause, Play, Edit, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { wsClient } from '@/services/wsClient'
import { useTaskStore } from '@/stores/taskStore'
import { useToast } from '@/components/ui/use-toast'
import type { InterventionAction, TaskStatus } from '@shared/types'

interface InterventionBarProps {
  taskId: string
}

/** Button config for each intervention action */
const INTERVENTION_BUTTONS: {
  action: InterventionAction
  label: string
  icon: typeof Pause
  variant: 'default' | 'outline' | 'destructive'
}[] = [
  { action: 'pause', label: '暂停', icon: Pause, variant: 'outline' },
  { action: 'resume', label: '恢复', icon: Play, variant: 'default' },
  { action: 'modify', label: '修改', icon: Edit, variant: 'outline' },
  { action: 'cancel', label: '终止', icon: Square, variant: 'destructive' },
]

/**
 * Determine which intervention buttons are enabled based on task status.
 */
function getEnabledActions(status: TaskStatus): Set<InterventionAction> {
  switch (status) {
    case 'in_progress':
      return new Set<InterventionAction>(['pause', 'modify', 'cancel'])
    case 'paused':
      return new Set<InterventionAction>(['resume', 'modify', 'cancel'])
    case 'review':
      return new Set<InterventionAction>(['modify', 'cancel'])
    case 'pending':
      return new Set<InterventionAction>(['modify', 'cancel'])
    case 'completed':
    case 'failed':
    case 'cancelled':
      return new Set<InterventionAction>()
    default:
      return new Set<InterventionAction>()
  }
}

export function InterventionBar({ taskId }: InterventionBarProps) {
  const currentTask = useTaskStore((s) => s.currentTask)
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus)
  const { toast } = useToast()

  const status: TaskStatus = currentTask?.status ?? 'pending'
  const enabledActions = getEnabledActions(status)

  const handleAction = (action: InterventionAction): void => {
    // Send intervention command via WebSocket
    wsClient.send('intervention:action', { action, taskId })

    // Optimistically update task status for immediate UI feedback
    const statusMap: Partial<Record<InterventionAction, TaskStatus>> = {
      pause: 'paused',
      resume: 'in_progress',
      cancel: 'cancelled',
    }
    const newStatus = statusMap[action]
    if (newStatus) {
      updateTaskStatus(newStatus)
    }

    const actionLabels: Record<InterventionAction, string> = {
      pause: '已暂停任务',
      resume: '已恢复任务',
      modify: '已请求修改',
      reject: '已拒绝',
      cancel: '已终止任务',
    }

    toast({
      title: actionLabels[action],
      description: `任务 ID: ${taskId}`,
    })
  }

  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
      <span className="mr-2 text-xs font-medium text-muted-foreground">
        人工干预
      </span>
      {INTERVENTION_BUTTONS.map((btn) => {
        const Icon = btn.icon
        const isEnabled = enabledActions.has(btn.action)

        return (
          <Tooltip key={btn.action}>
            <TooltipTrigger asChild>
              <span tabIndex={isEnabled ? 0 : -1}>
                <Button
                  variant={btn.variant}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!isEnabled}
                  onClick={() => handleAction(btn.action)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {btn.label}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isEnabled ? btn.label : `${btn.label} (当前不可用)`}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
