import type { WSEvent, WSEventType } from '@shared/types'

type EventHandler = (event: WSEvent) => void

/**
 * Singleton WebSocket client with auto-reconnect and event dispatching.
 * Supports subscribing to specific event types and sending structured messages.
 */
class WSClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect: boolean = true

  /**
   * Establish a WebSocket connection to the given URL.
   * Automatically reconnects on disconnect with exponential backoff.
   */
  connect(url: string): void {
    this.url = url
    this.shouldReconnect = true
    this.reconnectAttempts = 0
    this.createConnection()
  }

  private createConnection(): void {
    if (!this.url) return

    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      console.error('[WSClient] Failed to create WebSocket:', err)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.emit('_open', { type: '_open' as WSEventType, payload: null, timestamp: Date.now() })
    }

    this.ws.onclose = () => {
      this.emit('_close', { type: '_close' as WSEventType, payload: null, timestamp: Date.now() })
      this.scheduleReconnect()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WSEvent = JSON.parse(event.data as string)
        this.emit(data.type, data)
      } catch (err) {
        console.error('[WSClient] Failed to parse message:', err)
      }
    }

    this.ws.onerror = (error: Event) => {
      console.error('[WSClient] WebSocket error:', error)
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(() => {
      this.createConnection()
    }, delay)
  }

  /**
   * Register an event handler for a specific event type.
   * @returns An unsubscribe function
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Remove a previously registered event handler.
   */
  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler)
  }

  private emit(eventType: string, event: WSEvent): void {
    this.handlers.get(eventType)?.forEach((handler) => {
      try {
        handler(event)
      } catch (err) {
        console.error(`[WSClient] Error in handler for ${eventType}:`, err)
      }
    })
  }

  /**
   * Send a structured WebSocket event to the server.
   * No-ops if the connection is not open.
   */
  send(type: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WSEvent = {
        type: type as WSEventType,
        payload,
        timestamp: Date.now(),
      }
      this.ws.send(JSON.stringify(event))
    }
  }

  /**
   * Check if the WebSocket connection is currently open.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Close the WebSocket connection and stop reconnection attempts.
   */
  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsClient = new WSClient()
