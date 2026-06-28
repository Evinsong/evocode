import { create } from 'zustand'
import type { Agent, AgentRole, AgentStatus } from '@shared/types'
import { AGENT_ROLES } from '@shared/constants'

interface KanbanState {
  agents: Agent[]
  taskProgress: number
  setAgents: (agents: Agent[]) => void
  updateAgent: (agentId: string, partial: Partial<Agent>) => void
  updateAgentStatus: (agentId: string, status: AgentStatus, action?: string) => void
  setTaskProgress: (progress: number) => void
}

/**
 * Initialize 5 idle agents, one per role defined in AGENT_ROLES.
 */
function createInitialAgents(): Agent[] {
  return AGENT_ROLES.map((role: AgentRole) => ({
    id: `agent-${role}`,
    role,
    status: 'idle' as AgentStatus,
    currentAction: '',
    taskIds: [],
    startedAt: 0,
    modelProvider: 'openai',
    tokenUsage: 0,
  }))
}

export const useKanbanStore = create<KanbanState>((set) => ({
  agents: createInitialAgents(),
  taskProgress: 0,

  setAgents: (agents) => set({ agents }),

  updateAgent: (agentId, partial) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...partial } : agent,
      ),
    })),

  updateAgentStatus: (agentId, status, action) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              status,
              currentAction: action ?? agent.currentAction,
              startedAt: status === 'idle' ? 0 : agent.startedAt || Date.now(),
            }
          : agent,
      ),
    })),

  setTaskProgress: (taskProgress) => set({ taskProgress }),
}))
