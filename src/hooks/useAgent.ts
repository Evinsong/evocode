import { useKanbanStore } from '@/stores/kanbanStore'
import type { Agent, AgentRole } from '@shared/types'

interface UseAgentReturn {
  agents: Agent[]
  getAgentByRole: (role: AgentRole) => Agent | undefined
  getActiveAgents: () => Agent[]
}

/**
 * Hook for convenient access to agent data from the kanban store.
 * Provides helpers to find agents by role and filter active agents.
 */
export function useAgent(): UseAgentReturn {
  const agents = useKanbanStore((state) => state.agents)

  const getAgentByRole = (role: AgentRole): Agent | undefined => {
    return agents.find((agent) => agent.role === role)
  }

  const getActiveAgents = (): Agent[] => {
    return agents.filter(
      (agent) => agent.status !== 'idle' && agent.status !== 'completed',
    )
  }

  return { agents, getAgentByRole, getActiveAgents }
}
