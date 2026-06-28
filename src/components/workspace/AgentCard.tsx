import {
  ClipboardList,
  Layers,
  Code2,
  Bug,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AGENT_ROLE_LABELS, AGENT_STATUS_LABELS } from '@shared/constants'
import type { Agent, AgentRole, AgentStatus } from '@shared/types'
import { cn, formatDuration } from '@/lib/utils'

/** Icon for each agent role */
const ROLE_ICONS: Record<AgentRole, LucideIcon> = {
  requirements: ClipboardList,
  architecture: Layers,
  coding: Code2,
  testing: Bug,
  review: Eye,
}

/** Tailwind color classes for each agent status */
const STATUS_COLORS: Record<AgentStatus, { badge: string; dot: string; ring: string }> = {
  idle: {
    badge: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    dot: 'bg-gray-400',
    ring: '',
  },
  thinking: {
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dot: 'bg-blue-500 animate-pulse',
    ring: 'ring-2 ring-blue-500/30',
  },
  executing: {
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
    dot: 'bg-green-500',
    ring: '',
  },
  waiting_review: {
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    dot: 'bg-yellow-500',
    ring: '',
  },
  completed: {
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
    dot: 'bg-green-600',
    ring: '',
  },
  error: {
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500',
    ring: 'ring-2 ring-red-500/30',
  },
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const RoleIcon = ROLE_ICONS[agent.role]
  const statusColor = STATUS_COLORS[agent.status]
  const elapsed = agent.startedAt > 0 ? Date.now() - agent.startedAt : 0

  return (
    <Card className={cn('transition-all duration-300', statusColor.ring)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Role icon */}
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <RoleIcon className="h-5 w-5 text-foreground" />
            </div>
            {/* Status dot */}
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card',
                statusColor.dot,
              )}
            />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {AGENT_ROLE_LABELS[agent.role]}
              </span>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-xs', statusColor.badge)}
              >
                {AGENT_STATUS_LABELS[agent.status]}
              </Badge>
            </div>

            {/* Current action */}
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {agent.currentAction || '等待任务分配'}
            </p>

            {/* Footer: duration + tokens */}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              {elapsed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {formatDuration(elapsed)}
                </span>
              )}
              {agent.tokenUsage > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {agent.tokenUsage.toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
