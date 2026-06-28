import { useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Loader2, Trash2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useChatStore, createMessage } from '@/stores/chatStore'
import { useTaskStore } from '@/stores/taskStore'
import { apiClient } from '@/services/apiClient'
import { useToast } from '@/components/ui/use-toast'
import { AGENT_ROLE_LABELS } from '@shared/constants'
import type { Task } from '@shared/types'
import { cn, formatTime } from '@/lib/utils'

/** Quick command definitions */
const QUICK_COMMANDS = [
  { command: '/help', description: '显示帮助信息' },
  { command: '/clear', description: '清空对话记录' },
]

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages)
  const inputValue = useChatStore((s) => s.inputValue)
  const isSending = useChatStore((s) => s.isSending)
  const addMessage = useChatStore((s) => s.addMessage)
  const setInputValue = useChatStore((s) => s.setInputValue)
  const setSending = useChatStore((s) => s.setSending)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const setCurrentTask = useTaskStore((s) => s.setCurrentTask)
  const { toast } = useToast()

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]',
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages])

  const handleQuickCommand = (text: string): boolean => {
    const trimmed = text.trim()
    if (trimmed === '/help') {
      addMessage(
        createMessage(
          'system',
          `可用快捷指令：\n${QUICK_COMMANDS.map((c) => `  ${c.command} - ${c.description}`).join('\n')}`,
        ),
      )
      return true
    }
    if (trimmed === '/clear') {
      clearMessages()
      return true
    }
    return false
  }

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim()
    if (!text || isSending) return

    // Handle quick commands locally
    if (handleQuickCommand(text)) {
      setInputValue('')
      return
    }

    // Add user message to chat
    addMessage(createMessage('user', text))
    setInputValue('')
    setSending(true)

    try {
      // Create a task via API
      const task = await apiClient.post<Task>('/api/tasks', {
        title: text.slice(0, 50),
        description: text,
        priority: 'medium',
      })
      setCurrentTask(task)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发送失败'
      addMessage(createMessage('system', `错误: ${errorMsg}`))
      toast({
        title: '发送失败',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">对话面板</h3>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={clearMessages}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            清空
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-3 p-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                输入需求描述开始对话
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                输入 /help 查看快捷指令
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col gap-1',
                msg.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              {/* Agent role label for assistant messages */}
              {msg.role === 'assistant' && msg.agentRole && (
                <Badge variant="secondary" className="text-xs">
                  {AGENT_ROLE_LABELS[msg.agentRole]}
                </Badge>
              )}
              {msg.role === 'system' && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  系统
                </Badge>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.role === 'system'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>

              {/* Timestamp */}
              <span className="px-1 text-xs text-muted-foreground/60">
                {formatTime(msg.timestamp).slice(11)}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="shrink-0 border-t p-3">
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你的需求... (Enter 发送, Shift+Enter 换行)"
            className="min-h-[60px] max-h-[120px] resize-none pr-10 text-sm"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
