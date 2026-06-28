import { ChatPanel } from '@/components/workspace/ChatPanel'
import { KanbanBoard } from '@/components/workspace/KanbanBoard'
import { CodePreviewPanel } from '@/components/workspace/CodePreviewPanel'
import { InterventionBar } from '@/components/workspace/InterventionBar'
import { useTaskStore } from '@/stores/taskStore'
import type { TaskStatus } from '@shared/types'

/** Task statuses that show the intervention bar */
const INTERVENTION_STATUSES: TaskStatus[] = ['in_progress', 'paused', 'review', 'pending']

function WorkspacePage() {
  const currentTask = useTaskStore((s) => s.currentTask)
  const showIntervention =
    currentTask && INTERVENTION_STATUSES.includes(currentTask.status)

  return (
    <div className="flex h-full flex-col">
      {/* Intervention bar (conditional) */}
      {showIntervention && currentTask && (
        <InterventionBar taskId={currentTask.id} />
      )}

      {/* Three-column layout */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:flex-row">
        {/* Left: Chat (25% on xl, 50% on md) */}
        <div className="h-[400px] min-h-0 overflow-hidden rounded-lg border bg-card md:h-full md:w-1/2 xl:w-1/4">
          <ChatPanel />
        </div>

        {/* Center: Kanban (35% on xl, 50% on md) */}
        <div className="h-[500px] min-h-0 overflow-hidden rounded-lg border bg-card md:h-full md:w-1/2 xl:w-[35%]">
          <KanbanBoard />
        </div>

        {/* Right: Code Preview (40% on xl, hidden below xl) */}
        <div className="hidden min-h-0 overflow-hidden rounded-lg border bg-card xl:block xl:w-2/5">
          <CodePreviewPanel />
        </div>
      </div>
    </div>
  )
}

export default WorkspacePage
