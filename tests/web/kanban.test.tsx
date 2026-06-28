import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { KanbanBoard } from '@/components/workspace/KanbanBoard'
import { AgentCard } from '@/components/workspace/AgentCard'
import { useKanbanStore } from '@/stores/kanbanStore'
import { AGENT_ROLES, AGENT_ROLE_LABELS, AGENT_STATUS_LABELS } from '@shared/constants'
import type { Agent, AgentStatus } from '@shared/types'

/** Create a test agent with the given role and status */
function createAgent(role: Agent['role'], status: AgentStatus): Agent {
  return {
    id: `agent-${role}`,
    role,
    status,
    currentAction: status === 'idle' ? '' : '正在处理任务',
    taskIds: [],
    startedAt: status === 'idle' ? 0 : Date.now() - 5000,
    modelProvider: 'openai',
    tokenUsage: status === 'idle' ? 0 : 1234,
  }
}

/** Reset kanban store to initial state with 5 idle agents */
function resetKanbanStore(): void {
  const initialAgents: Agent[] = AGENT_ROLES.map((role) => ({
    id: `agent-${role}`,
    role,
    status: 'idle' as AgentStatus,
    currentAction: '',
    taskIds: [],
    startedAt: 0,
    modelProvider: 'openai',
    tokenUsage: 0,
  }))
  useKanbanStore.setState({ agents: initialAgents, taskProgress: 0 })
}

describe('KanbanBoard', () => {
  beforeEach(() => {
    resetKanbanStore()
  })

  it('renders 5 AgentCards for all roles', () => {
    render(<KanbanBoard />)

    // Check all 5 role labels are present
    AGENT_ROLES.forEach((role) => {
      expect(screen.getByText(AGENT_ROLE_LABELS[role])).toBeInTheDocument()
    })
  })

  it('displays task progress bar', () => {
    useKanbanStore.setState({ taskProgress: 50 })
    render(<KanbanBoard />)

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows agent count in header', () => {
    render(<KanbanBoard />)

    expect(screen.getByText('5 Agents')).toBeInTheDocument()
  })
})

describe('AgentCard', () => {
  it('displays role label and idle status', () => {
    const agent = createAgent('requirements', 'idle')
    render(<AgentCard agent={agent} />)

    expect(screen.getByText(AGENT_ROLE_LABELS.requirements)).toBeInTheDocument()
    expect(screen.getByText(AGENT_STATUS_LABELS.idle)).toBeInTheDocument()
  })

  it('displays thinking status with correct badge color', () => {
    const agent = createAgent('coding', 'thinking')
    const { container } = render(<AgentCard agent={agent} />)

    expect(screen.getByText(AGENT_STATUS_LABELS.thinking)).toBeInTheDocument()

    // Check the badge has blue color classes
    const badge = screen.getByText(AGENT_STATUS_LABELS.thinking)
    expect(badge.className).toContain('blue')
  })

  it('displays executing status with correct badge color', () => {
    const agent = createAgent('architecture', 'executing')
    render(<AgentCard agent={agent} />)

    expect(screen.getByText(AGENT_STATUS_LABELS.executing)).toBeInTheDocument()

    const badge = screen.getByText(AGENT_STATUS_LABELS.executing)
    expect(badge.className).toContain('green')
  })

  it('displays error status with correct badge color', () => {
    const agent = createAgent('testing', 'error')
    render(<AgentCard agent={agent} />)

    expect(screen.getByText(AGENT_STATUS_LABELS.error)).toBeInTheDocument()

    const badge = screen.getByText(AGENT_STATUS_LABELS.error)
    expect(badge.className).toContain('red')
  })

  it('displays waiting_review status with correct badge color', () => {
    const agent = createAgent('review', 'waiting_review')
    render(<AgentCard agent={agent} />)

    expect(screen.getByText(AGENT_STATUS_LABELS.waiting_review)).toBeInTheDocument()

    const badge = screen.getByText(AGENT_STATUS_LABELS.waiting_review)
    expect(badge.className).toContain('yellow')
  })

  it('shows current action text when not idle', () => {
    const agent = createAgent('coding', 'executing')
    agent.currentAction = '正在编写 React 组件'
    render(<AgentCard agent={agent} />)

    expect(screen.getByText('正在编写 React 组件')).toBeInTheDocument()
  })

  it('shows placeholder text when idle', () => {
    const agent = createAgent('requirements', 'idle')
    render(<AgentCard agent={agent} />)

    expect(screen.getByText('等待任务分配')).toBeInTheDocument()
  })

  it('shows token usage when non-zero', () => {
    const agent = createAgent('coding', 'executing')
    agent.tokenUsage = 5678
    render(<AgentCard agent={agent} />)

    expect(screen.getByText(/5,678 tokens/)).toBeInTheDocument()
  })
})

describe('kanbanStore', () => {
  beforeEach(() => {
    resetKanbanStore()
  })

  it('initializes with 5 idle agents', () => {
    const { agents } = useKanbanStore.getState()

    expect(agents).toHaveLength(5)
    agents.forEach((agent) => {
      expect(agent.status).toBe('idle')
    })
  })

  it('updateAgentStatus correctly updates agent status', () => {
    const { updateAgentStatus } = useKanbanStore.getState()

    updateAgentStatus('agent-coding', 'executing', '正在编写代码')

    const { agents } = useKanbanStore.getState()
    const codingAgent = agents.find((a) => a.role === 'coding')

    expect(codingAgent).toBeDefined()
    expect(codingAgent!.status).toBe('executing')
    expect(codingAgent!.currentAction).toBe('正在编写代码')
  })

  it('updateAgentStatus sets startedAt when transitioning from idle', () => {
    const { updateAgentStatus } = useKanbanStore.getState()
    const beforeTime = Date.now()

    updateAgentStatus('agent-architecture', 'thinking')

    const { agents } = useKanbanStore.getState()
    const architectureAgent = agents.find((a) => a.role === 'architecture')

    expect(architectureAgent!.startedAt).toBeGreaterThanOrEqual(beforeTime)
  })

  it('updateAgentStatus resets startedAt to 0 when going idle', () => {
    const { updateAgentStatus } = useKanbanStore.getState()

    // First set to executing
    updateAgentStatus('agent-testing', 'executing')
    expect(
      useKanbanStore.getState().agents.find((a) => a.role === 'testing')!.startedAt,
    ).toBeGreaterThan(0)

    // Then back to idle
    updateAgentStatus('agent-testing', 'idle')
    expect(
      useKanbanStore.getState().agents.find((a) => a.role === 'testing')!.startedAt,
    ).toBe(0)
  })

  it('updateAgent updates partial agent data', () => {
    const { updateAgent } = useKanbanStore.getState()

    updateAgent('agent-review', { tokenUsage: 9999, currentAction: '审查代码中' })

    const { agents } = useKanbanStore.getState()
    const reviewAgent = agents.find((a) => a.role === 'review')

    expect(reviewAgent!.tokenUsage).toBe(9999)
    expect(reviewAgent!.currentAction).toBe('审查代码中')
  })

  it('setAgents replaces all agents', () => {
    const { setAgents } = useKanbanStore.getState()

    const newAgents: Agent[] = [
      createAgent('requirements', 'completed'),
      createAgent('architecture', 'completed'),
      createAgent('coding', 'executing'),
      createAgent('testing', 'idle'),
      createAgent('review', 'idle'),
    ]

    setAgents(newAgents)

    const { agents } = useKanbanStore.getState()
    expect(agents).toHaveLength(5)
    expect(agents[0].status).toBe('completed')
    expect(agents[2].status).toBe('executing')
  })

  it('setTaskProgress updates progress value', () => {
    const { setTaskProgress } = useKanbanStore.getState()

    setTaskProgress(75)

    expect(useKanbanStore.getState().taskProgress).toBe(75)
  })

  it('does not affect other agents when updating one', () => {
    const { updateAgentStatus } = useKanbanStore.getState()

    updateAgentStatus('agent-coding', 'executing')

    const { agents } = useKanbanStore.getState()
    const codingAgent = agents.find((a) => a.role === 'coding')
    const requirementsAgent = agents.find((a) => a.role === 'requirements')

    expect(codingAgent!.status).toBe('executing')
    expect(requirementsAgent!.status).toBe('idle')
  })
})
