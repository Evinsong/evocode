import { create } from 'zustand'
import type { AgentRole, ChatMessage } from '@shared/types'

/**
 * Extended chat message with display metadata (id, timestamp, agent role).
 */
export interface DisplayChatMessage extends ChatMessage {
  id: string
  timestamp: number
  agentRole?: AgentRole
}

interface ChatState {
  messages: DisplayChatMessage[]
  inputValue: string
  isSending: boolean
  addMessage: (msg: DisplayChatMessage) => void
  setInputValue: (value: string) => void
  setSending: (sending: boolean) => void
  clearMessages: () => void
}

let messageIdCounter: number = 0

function generateMessageId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  inputValue: '',
  isSending: false,

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  setInputValue: (inputValue) => set({ inputValue }),

  setSending: (isSending) => set({ isSending }),

  clearMessages: () => set({ messages: [] }),
}))

/**
 * Create a display chat message with auto-generated id and timestamp.
 */
export function createMessage(
  role: ChatMessage['role'],
  content: string,
  agentRole?: AgentRole,
): DisplayChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
    agentRole,
  }
}
