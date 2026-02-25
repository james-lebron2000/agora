import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { redisService } from './redis';
import { authService } from './auth';
import { logger } from '../utils/logger';
import { WebSocketMessage } from '../types';

interface WebSocketClient extends WebSocket {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocketClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws as WebSocketClient, req);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 30000);

    // Subscribe to Redis channels for broadcasting
    this.setupRedisSubscriptions();

    logger.info('WebSocket server initialized');
  }

  private handleConnection(client: WebSocketClient, req: any): void {
    client.id = Math.random().toString(36).substring(2, 15);
    client.subscriptions = new Set();
    client.isAlive = true;

    this.clients.set(client.id, client);

    logger.info(`WebSocket client connected: ${client.id}`, {
      ip: req.socket.remoteAddress,
      totalClients: this.clients.size,
    });

    // Send welcome message
    this.sendToClient(client, {
      type: 'connection:established',
      payload: { clientId: client.id },
      timestamp: Date.now(),
    });

    // Handle messages
    client.on('message', (data) => {
      this.handleMessage(client, data.toString());
    });

    // Handle pong (heartbeat response)
    client.on('pong', () => {
      client.isAlive = true;
    });

    // Handle close
    client.on('close', () => {
      this.handleDisconnect(client);
    });

    // Handle errors
    client.on('error', (error) => {
      logger.error(`WebSocket error for client ${client.id}:`, error);
    });
  }

  private async handleMessage(client: WebSocketClient, data: string): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      logger.debug(`WebSocket message from ${client.id}:`, { type: message.type });

      switch (message.type) {
        case 'auth':
          await this.handleAuth(client, message.payload);
          break;

        case 'subscribe:agent':
          this.handleSubscribe(client, `agent:${(message.payload as any).agentId}`);
          break;

        case 'subscribe:task':
          this.handleSubscribe(client, `task:${(message.payload as any).taskId}`);
          break;

        case 'subscribe:payments':
          this.handleSubscribe(client, 'payments');
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(client, (message.payload as any).channel);
          break;

        case 'ping':
          this.sendToClient(client, {
            type: 'pong',
            payload: { timestamp: Date.now() },
            timestamp: Date.now(),
          });
          break;

        default:
          this.sendToClient(client, {
            type: 'error',
            payload: { message: `Unknown message type: ${message.type}` },
            timestamp: Date.now(),
          });
      }
    } catch (error) {
      logger.error('WebSocket message handling error:', error);
      this.sendToClient(client, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleAuth(client: WebSocketClient, payload: unknown): Promise<void> {
    const { token } = payload as { token: string };

    try {
      const payload = await authService.validateToken(token);
      
      if (payload) {
        client.userId = payload.sub;
        
        this.sendToClient(client, {
          type: 'auth:success',
          payload: { userId: payload.sub },
          timestamp: Date.now(),
        });

        logger.info(`WebSocket client ${client.id} authenticated as ${payload.sub}`);
      } else {
        this.sendToClient(client, {
          type: 'auth:error',
          payload: { message: 'Invalid token' },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.sendToClient(client, {
        type: 'auth:error',
        payload: { message: 'Authentication failed' },
        timestamp: Date.now(),
      });
    }
  }

  private handleSubscribe(client: WebSocketClient, channel: string): void {
    client.subscriptions.add(channel);
    
    this.sendToClient(client, {
      type: 'subscription:confirmed',
      payload: { channel },
      timestamp: Date.now(),
    });

    logger.debug(`Client ${client.id} subscribed to ${channel}`);
  }

  private handleUnsubscribe(client: WebSocketClient, channel: string): void {
    client.subscriptions.delete(channel);
    
    this.sendToClient(client, {
      type: 'subscription:cancelled',
      payload: { channel },
      timestamp: Date.now(),
    });

    logger.debug(`Client ${client.id} unsubscribed from ${channel}`);
  }

  private handleDisconnect(client: WebSocketClient): void {
    this.clients.delete(client.id);
    
    logger.info(`WebSocket client disconnected: ${client.id}`, {
      totalClients: this.clients.size,
    });
  }

  private heartbeat(): void {
    this.clients.forEach((client) => {
      if (!client.isAlive) {
        client.terminate();
        this.clients.delete(client.id);
        return;
      }

      client.isAlive = false;
      client.ping();
    });
  }

  private setupRedisSubscriptions(): void {
    // Subscribe to Redis pub/sub channels
    redisService.subscribe('tasks:created', (message) => {
      this.broadcast('tasks', { type: 'task:created', payload: JSON.parse(message) });
    });

    redisService.subscribe('tasks:updated', (message) => {
      const data = JSON.parse(message);
      this.broadcast(`task:${data.taskId}`, { type: 'task:updated', payload: data });
    });

    redisService.subscribe('tasks:cancelled', (message) => {
      const data = JSON.parse(message);
      this.broadcast(`task:${data.taskId}`, { type: 'task:cancelled', payload: data });
    });

    redisService.subscribe('payments:completed', (message) => {
      this.broadcast('payments', { type: 'payment:completed', payload: JSON.parse(message) });
    });
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast to all clients subscribed to a channel
  broadcast(channel: string, message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
    };

    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.subscriptions.has(channel) || client.subscriptions.has('*')) {
        this.sendToClient(client, fullMessage);
        sentCount++;
      }
    });

    logger.debug(`Broadcast to ${channel}: ${sentCount} clients`);
  }

  // Send to specific user
  sendToUser(userId: string, message: WebSocketMessage): void {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClient(client, message);
      }
    });
  }

  // Get connection stats
  getStats(): { totalClients: number; authenticatedClients: number } {
    let authenticated = 0;
    this.clients.forEach((client) => {
      if (client.userId) authenticated++;
    });

    return {
      totalClients: this.clients.size,
      authenticatedClients: authenticated,
    };
  }

  // Graceful shutdown
  async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
