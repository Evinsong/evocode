import type { WebSocketServer, WebSocket } from 'ws';
import type { WSEvent, WSEventType } from '../../shared/types';
import { logger } from '../lib/logger';

/**
 * WebSocketHandler manages WebSocket connections and event broadcasting.
 * Wraps the ws.WebSocketServer to provide a clean API for:
 * - Broadcasting events to all connected clients
 * - Sending events to specific clients
 * - Receiving and dispatching messages from clients (e.g., intervention commands)
 */
export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Set<WebSocket>;
  private messageCallbacks: Array<(ws: WebSocket, event: WSEvent) => void>;

  /**
   * Create a WebSocketHandler that wraps an existing WebSocketServer.
   * Sets up connection handling, client tracking, and message routing.
   * @param wss - The WebSocketServer instance to wrap
   */
  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.clients = new Set();
    this.messageCallbacks = [];

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress ?? 'unknown';
      logger.info('WebSocket', `New connection from ${clientIp}`);

      this.clients.add(ws);

      // Send welcome message
      this.send(ws, 'kanban:update', { message: 'EvoCode WebSocket connected' });

      ws.on('message', (data: Buffer) => {
        try {
          const raw = data.toString();
          const event = JSON.parse(raw) as WSEvent;
          logger.debug('WebSocket', `Received event: ${event.type}`);

          // Dispatch to registered callbacks
          for (const callback of this.messageCallbacks) {
            callback(ws, event);
          }
        } catch {
          logger.warn('WebSocket', `Failed to parse message: ${data.toString().substring(0, 200)}`);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('WebSocket', `Connection closed from ${clientIp}`);
      });

      ws.on('error', (err: Error) => {
        logger.error('WebSocket', `Connection error: ${err.message}`);
      });
    });
  }

  /**
   * Broadcast an event to all connected clients.
   * @param type - WebSocket event type
   * @param payload - Event payload data
   */
  broadcast<T>(type: WSEventType, payload: T): void {
    const event: WSEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };
    const message = JSON.stringify(event);

    let sentCount = 0;
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
        sentCount++;
      }
    }

    logger.debug('WebSocket', `Broadcast ${type} to ${sentCount} clients`);
  }

  /**
   * Send an event to a specific client.
   * @param ws - Target WebSocket connection
   * @param type - WebSocket event type
   * @param payload - Event payload data
   */
  send<T>(ws: WebSocket, type: WSEventType, payload: T): void {
    const event: WSEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(event));
  }

  /**
   * Register a callback to handle incoming messages from clients.
   * Used for receiving intervention commands from the frontend.
   * @param callback - Function called with (ws, event) for each incoming message
   */
  onMessage(callback: (ws: WebSocket, event: WSEvent) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Get the current number of connected clients.
   * @returns Number of active WebSocket connections
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
