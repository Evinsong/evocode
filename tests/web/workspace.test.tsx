import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// Use vi.hoisted to ensure mock functions exist before vi.mock factories run
const { mockPost, mockWsSend } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockWsSend: vi.fn(),
}))

// Mock apiClient
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    post: mockPost,
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
  },
}))

// Mock wsClient
vi.mock('@/services/wsClient', () => ({
  wsClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: mockWsSend,
    on: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
    isConnected: false,
  },
}))

// Mock useWebSocket to avoid real connections
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connected: true, send: vi.fn() }),
}))

// Mock useSettingsStore to avoid API calls during loadSettings
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        model: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096 },
        theme: 'dark',
        language: 'zh',
        hasApiKey: false,
        storagePath: '',
        setModel: vi.fn(),
        setTheme: vi.fn(),
        setLanguage: vi.fn(),
        setHasApiKey: vi.fn(),
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
      }),
    {
      getState: () => ({
        model: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096 },
        theme: 'dark',
        language: 'zh',
        hasApiKey: false,
        storagePath: '',
      }),
      setState: vi.fn(),
    },
  ),
}))

import WorkspacePage from '@/pages/WorkspacePage'
import { ChatPanel } from '@/components/workspace/ChatPanel'
import { InterventionBar } from '@/components/workspace/InterventionBar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTaskStore } from '@/stores/taskStore'
import { useChatStore } from '@/stores/chatStore'
import type { Task } from '@shared/types'

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const mockTask: Task = {
  id: 'task-test-1',
  title: 'Test Task',
  description: 'A test task',
  status: 'in_progress',
  priority: 'medium',
  assignedAgentId: null,
  parentTaskId: null,
  steps: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

describe('WorkspacePage', () => {
  beforeEach(() => {
    useTaskStore.setState({
      currentTask: null,
      generatedFiles: [],
      selectedFileIndex: 0,
    })
    useChatStore.setState({ messages: [], inputValue: '', isSending: false })
    mockPost.mockClear()
    mockPost.mockResolvedValue(mockTask)
  })

  it('renders three-column layout with chat, kanban, and code preview panels', () => {
    renderWithRouter(<WorkspacePage />)

    // ChatPanel header
    expect(screen.getByText('对话面板')).toBeInTheDocument()

    // KanbanBoard header
    expect(screen.getByText('协作看板')).toBeInTheDocument()

    // CodePreviewPanel tabs
    expect(screen.getByText('代码')).toBeInTheDocument()
    expect(screen.getByText('预览')).toBeInTheDocument()
  })

  it('shows intervention bar when task is in progress', () => {
    useTaskStore.setState({ currentTask: mockTask })
    renderWithRouter(<WorkspacePage />)

    expect(screen.getByText('人工干预')).toBeInTheDocument()
  })

  it('hides intervention bar when no task exists', () => {
    renderWithRouter(<WorkspacePage />)

    expect(screen.queryByText('人工干预')).not.toBeInTheDocument()
  })
})

describe('ChatPanel', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], inputValue: '', isSending: false })
    useTaskStore.setState({
      currentTask: null,
      generatedFiles: [],
      selectedFileIndex: 0,
    })
    mockPost.mockClear()
    mockPost.mockResolvedValue(mockTask)
  })

  it('renders input textarea and send button', () => {
    render(<ChatPanel />)

    expect(
      screen.getByPlaceholderText(/描述你的需求/),
    ).toBeInTheDocument()
  })

  it('calls apiClient.post when sending a message', async () => {
    render(<ChatPanel />)

    const textarea = screen.getByPlaceholderText(/描述你的需求/)
    fireEvent.change(textarea, { target: { value: '创建一个登录页面' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          description: '创建一个登录页面',
        }),
      )
    })
  })

  it('adds user message to chat on send', async () => {
    render(<ChatPanel />)

    const textarea = screen.getByPlaceholderText(/描述你的需求/)
    fireEvent.change(textarea, { target: { value: 'Hello World' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })
  })

  it('handles /clear command locally', () => {
    render(<ChatPanel />)

    const textarea = screen.getByPlaceholderText(/描述你的需求/)

    // Send a message first
    fireEvent.change(textarea, { target: { value: 'test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(screen.getByText('test message')).toBeInTheDocument()

    // Clear with /clear command
    fireEvent.change(textarea, { target: { value: '/clear' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(screen.queryByText('test message')).not.toBeInTheDocument()
  })

  it('does not send empty messages', () => {
    render(<ChatPanel />)

    const textarea = screen.getByPlaceholderText(/描述你的需求/)
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(mockPost).not.toHaveBeenCalled()
  })
})

describe('InterventionBar', () => {
  beforeEach(() => {
    mockWsSend.mockClear()
  })

  function renderInterventionBar(): ReturnType<typeof render> {
    return render(
      <TooltipProvider>
        <InterventionBar taskId="task-test-1" />
      </TooltipProvider>,
    )
  }

  it('enables pause and disables resume when task is in_progress', () => {
    useTaskStore.setState({
      currentTask: { ...mockTask, status: 'in_progress' },
    })

    renderInterventionBar()

    const pauseButton = screen.getByText('暂停').closest('button')!
    const resumeButton = screen.getByText('恢复').closest('button')!

    expect(pauseButton).not.toBeDisabled()
    expect(resumeButton).toBeDisabled()
  })

  it('disables pause and enables resume when task is paused', () => {
    useTaskStore.setState({
      currentTask: { ...mockTask, status: 'paused' },
    })

    renderInterventionBar()

    const pauseButton = screen.getByText('暂停').closest('button')!
    const resumeButton = screen.getByText('恢复').closest('button')!

    expect(pauseButton).toBeDisabled()
    expect(resumeButton).not.toBeDisabled()
  })

  it('disables all buttons when task is completed', () => {
    useTaskStore.setState({
      currentTask: { ...mockTask, status: 'completed' },
    })

    renderInterventionBar()

    const pauseButton = screen.getByText('暂停').closest('button')!
    const resumeButton = screen.getByText('恢复').closest('button')!
    const modifyButton = screen.getByText('修改').closest('button')!
    const cancelButton = screen.getByText('终止').closest('button')!

    expect(pauseButton).toBeDisabled()
    expect(resumeButton).toBeDisabled()
    expect(modifyButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('sends intervention action via wsClient on button click', () => {
    useTaskStore.setState({
      currentTask: { ...mockTask, status: 'in_progress' },
    })

    renderInterventionBar()

    const pauseButton = screen.getByText('暂停').closest('button')!
    fireEvent.click(pauseButton)

    expect(mockWsSend).toHaveBeenCalledWith(
      'intervention:action',
      expect.objectContaining({
        action: 'pause',
        taskId: 'task-test-1',
      }),
    )
  })
})
