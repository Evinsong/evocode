import { useState, useEffect, useCallback } from 'react'
import type { Agent, AgentRole, AgentStatus, Task, TaskStatus, GeneratedFile, WSEvent } from '@shared/types'
import { wsClient } from '@/services/wsClient'
import { useTaskStore } from '@/stores/taskStore'
import { useKanbanStore } from '@/stores/kanbanStore'

// ---- WS Event Payload Type Definitions ----

interface TaskCreatedPayload {
  task: Task
}

interface TaskUpdatedPayload {
  task: Partial<Task>
  status?: TaskStatus
}

interface AgentStatusChangedPayload {
  agentId: string
  role: AgentRole
  status: AgentStatus
  action?: string
}

interface AgentActionPayload {
  agentId: string
  role: AgentRole
  action: string
}

interface CodeGeneratedPayload {
  file: GeneratedFile
}

interface KanbanUpdatePayload {
  agents: Agent[]
  progress: number
}

interface UseWebSocketReturn {
  connected: boolean
  send: (type: string, payload: unknown) => void
}

/**
 * WebSocket hook that manages connection lifecycle and dispatches
 * incoming events to the appropriate Zustand stores.
 *
 * Event routing:
 * - task:*  → taskStore (setCurrentTask, updateTaskStatus)
 * - agent:*, kanban:update → kanbanStore (updateAgentStatus, setAgents)
 * - code:*  → taskStore (addGeneratedFile)
 */
export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL
      ? `${import.meta.env.VITE_WS_URL}/ws`
      : `ws://${window.location.host}/ws`

    wsClient.connect(wsUrl)

    // Connection lifecycle handlers
    const unsubOpen = wsClient.on('_open', () => setConnected(true))
    const unsubClose = wsClient.on('_close', () => setConnected(false))

    // Task events → taskStore
    const unsubTaskCreated = wsClient.on('task:created', (event: WSEvent) => {
      const payload = event.payload as TaskCreatedPayload
      useTaskStore.getState().setCurrentTask(payload.task)
    })

    const unsubTaskUpdated = wsClient.on('task:updated', (event: WSEvent) => {
      const payload = event.payload as TaskUpdatedPayload
      const store = useTaskStore.getState()
      if (payload.status) {
        store.updateTaskStatus(payload.status)
      }
      if (payload.task) {
        const current = store.currentTask
        if (current) {
          store.setCurrentTask({ ...current, ...payload.task })
        }
      }
    })

    const unsubTaskCompleted = wsClient.on('task:completed', (event: WSEvent) => {
      const payload = event.payload as TaskCreatedPayload
      useTaskStore.getState().setCurrentTask(payload.task)
    })

    const unsubTaskFailed = wsClient.on('task:failed', (event: WSEvent) => {
      const payload = event.payload as TaskCreatedPayload
      useTaskStore.getState().setCurrentTask(payload.task)
    })

    // Agent events → kanbanStore
    const unsubAgentStatus = wsClient.on('agent:status_changed', (event: WSEvent) => {
      const payload = event.payload as AgentStatusChangedPayload
      useKanbanStore.getState().updateAgentStatus(
        payload.agentId,
        payload.status,
        payload.action,
      )
    })

    const unsubAgentAction = wsClient.on('agent:action', (event: WSEvent) => {
      const payload = event.payload as AgentActionPayload
      useKanbanStore.getState().updateAgent(payload.agentId, {
        currentAction: payload.action,
      })
    })

    const unsubKanbanUpdate = wsClient.on('kanban:update', (event: WSEvent) => {
      const payload = event.payload as KanbanUpdatePayload
      const store = useKanbanStore.getState()
      store.setAgents(payload.agents)
      store.setTaskProgress(payload.progress)
    })

    // Code events → taskStore
    const unsubCodeGenerated = wsClient.on('code:generated', (event: WSEvent) => {
      const payload = event.payload as CodeGeneratedPayload
      useTaskStore.getState().addGeneratedFile(payload.file)
    })

    const unsubCodeUpdated = wsClient.on('code:updated', (event: WSEvent) => {
      const payload = event.payload as CodeGeneratedPayload
      const store = useTaskStore.getState()
      const files = store.generatedFiles.map((f) =>
        f.id === payload.file.id ? payload.file : f,
      )
      store.setGeneratedFiles(files)
    })

    return () => {
      unsubOpen()
      unsubClose()
      unsubTaskCreated()
      unsubTaskUpdated()
      unsubTaskCompleted()
      unsubTaskFailed()
      unsubAgentStatus()
      unsubAgentAction()
      unsubKanbanUpdate()
      unsubCodeGenerated()
      unsubCodeUpdated()
      wsClient.disconnect()
    }
  }, [])

  const send = useCallback((type: string, payload: unknown): void => {
    wsClient.send(type, payload)
  }, [])

  return { connected, send }
}
