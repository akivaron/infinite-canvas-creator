import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { parse } from 'url';

export interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  sessionId?: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true
    });

    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const { query } = parse(req.url || '', true);
      const clientId = this.generateClientId();

      const client: WSClient = {
        id: clientId,
        ws,
        userId: query.userId as string,
        sessionId: query.sessionId as string,
        isAlive: true
      };

      this.clients.set(clientId, client);

      console.log(`✓ WebSocket client connected: ${clientId} (Total: ${this.clients.size})`);

      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`✗ WebSocket client disconnected: ${clientId} (Total: ${this.clients.size})`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    this.startHeartbeat();

    console.log('✓ WebSocket Server initialized on path: /ws');
  }

  private handleMessage(clientId: string, message: any) {
    console.log(`Received message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      case 'subscribe':
        const client = this.clients.get(clientId);
        if (client && message.sessionId) {
          client.sessionId = message.sessionId;
          this.sendToClient(clientId, {
            type: 'subscribed',
            sessionId: message.sessionId,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'unsubscribe':
        const unsubClient = this.clients.get(clientId);
        if (unsubClient) {
          unsubClient.sessionId = undefined;
          this.sendToClient(clientId, {
            type: 'unsubscribed',
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  public broadcastToSession(sessionId: string, data: any) {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
        sentCount++;
      }
    });
    return sentCount;
  }

  public broadcastToUser(userId: string, data: any) {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
        sentCount++;
      }
    });
    return sentCount;
  }

  public broadcast(data: any) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }

  public notifyAIComplete(sessionId: string, result: any) {
    const sentCount = this.broadcastToSession(sessionId, {
      type: 'ai_complete',
      sessionId,
      result,
      timestamp: new Date().toISOString()
    });
    console.log(`✓ AI completion notification sent to ${sentCount} client(s) for session ${sessionId}`);
    return sentCount;
  }

  public notifyAIProgress(sessionId: string, progress: any) {
    return this.broadcastToSession(sessionId, {
      type: 'ai_progress',
      sessionId,
      progress,
      timestamp: new Date().toISOString()
    });
  }

  public notifyAIError(sessionId: string, error: any) {
    return this.broadcastToSession(sessionId, {
      type: 'ai_error',
      sessionId,
      error,
      timestamp: new Date().toISOString()
    });
  }

  public notifyAIStart(sessionId: string, task: any) {
    return this.broadcastToSession(sessionId, {
      type: 'ai_start',
      sessionId,
      task,
      timestamp: new Date().toISOString()
    });
  }

  public getStats() {
    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        c => c.ws.readyState === WebSocket.OPEN
      ).length,
      clients: Array.from(this.clients.values()).map(c => ({
        id: c.id,
        userId: c.userId,
        sessionId: c.sessionId,
        isAlive: c.isAlive,
        state: c.ws.readyState
      }))
    };
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.wss.close();
    console.log('✗ WebSocket Server closed');
  }
}

let wsManager: WebSocketManager | null = null;

export const initializeWebSocket = (server: HttpServer): WebSocketManager => {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManager;
};
