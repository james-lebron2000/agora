/**
 * Push Notification Service
 * 
 * Handles Expo Push API integration, notification queuing with Redis,
 * and batch sending of push notifications.
 * 
 * @module services/notifications
 */

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { config } from '../config';
import { redisService } from './redis';
import { logger } from '../utils/logger';
import {
  PushToken,
  NotificationPayload,
  NotificationType,
  QueuedNotification,
  NotificationData,
  NotificationPriority,
  NotificationStats,
} from '../types/notifications';

/**
 * Redis key prefixes for notification data
 */
const TOKEN_PREFIX = 'push:token';
const WALLET_TOKENS_PREFIX = 'push:wallet';
const QUEUE_KEY = `${config.notifications.queuePrefix}:items`;
const STATS_KEY = 'push:stats';
const INVALID_TOKEN_PREFIX = 'push:invalid';

/**
 * Service for managing push notifications via Expo Push API
 */
class NotificationService {
  private expo: Expo;
  private isProcessing: boolean = false;

  constructor() {
    this.expo = new Expo({
      accessToken: config.notifications.expoAccessToken,
    });

    // Start background queue processor
    this.startQueueProcessor();
  }

  /**
   * Register a push token for a wallet address
   * 
   * @param token - The Expo push token
   * @param walletAddress - The wallet address to associate
   * @param platform - Device platform (ios, android, web)
   * @returns The stored push token data
   */
  async registerToken(
    token: string,
    walletAddress: string,
    platform: 'ios' | 'android' | 'web' = 'ios'
  ): Promise<PushToken> {
    // Validate the token format
    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Invalid Expo push token format');
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const tokenData: PushToken = {
      token,
      walletAddress: normalizedWallet,
      platform,
      registeredAt: new Date().toISOString(),
      isActive: true,
    };

    // Store token data
    await redisService.set(`${TOKEN_PREFIX}:${token}`, tokenData);

    // Add token to wallet's token set
    await redisService.getClient().sadd(
      `${WALLET_TOKENS_PREFIX}:${normalizedWallet}`,
      token
    );

    logger.info(`Registered push token for wallet ${normalizedWallet}`, {
      token: token.substring(0, 20) + '...',
      platform,
    });

    return tokenData;
  }

  /**
   * Unregister a push token
   * 
   * @param token - The Expo push token to remove
   * @returns true if token was found and removed
   */
  async unregisterToken(token: string): Promise<boolean> {
    // Get token data to find associated wallet
    const tokenData = await redisService.get<PushToken>(`${TOKEN_PREFIX}:${token}`);

    if (!tokenData) {
      logger.warn(`Attempted to unregister unknown token: ${token.substring(0, 20)}...`);
      return false;
    }

    // Remove from token store
    await redisService.delete(`${TOKEN_PREFIX}:${token}`);

    // Remove from wallet's token set
    await redisService.getClient().srem(
      `${WALLET_TOKENS_PREFIX}:${tokenData.walletAddress}`,
      token
    );

    logger.info(`Unregistered push token for wallet ${tokenData.walletAddress}`, {
      token: token.substring(0, 20) + '...',
    });

    return true;
  }

  /**
   * Get all push tokens for a wallet address
   * 
   * @param walletAddress - The wallet address
   * @returns Array of push tokens
   */
  async getTokensForWallet(walletAddress: string): Promise<PushToken[]> {
    const normalizedWallet = walletAddress.toLowerCase();
    const tokens = await redisService.getClient().smembers(
      `${WALLET_TOKENS_PREFIX}:${normalizedWallet}`
    );

    const tokenDataList: PushToken[] = [];
    for (const token of tokens) {
      const data = await redisService.get<PushToken>(`${TOKEN_PREFIX}:${token}`);
      if (data && data.isActive) {
        tokenDataList.push(data);
      }
    }

    return tokenDataList;
  }

  /**
   * Check if a token is marked as invalid
   * 
   * @param token - The token to check
   * @returns true if token is invalid
   */
  private async isInvalidToken(token: string): Promise<boolean> {
    const exists = await redisService.getClient().exists(`${INVALID_TOKEN_PREFIX}:${token}`);
    return exists === 1;
  }

  /**
   * Mark a token as invalid and remove it from active tokens
   * 
   * @param token - The invalid token
   */
  private async markTokenInvalid(token: string): Promise<void> {
    // Add to invalid tokens set with 30-day expiration
    await redisService.set(`${INVALID_TOKEN_PREFIX}:${token}`, {
      token,
      invalidatedAt: new Date().toISOString(),
    }, 30 * 24 * 60 * 60);

    // Remove from active tokens
    const tokenData = await redisService.get<PushToken>(`${TOKEN_PREFIX}:${token}`);
    if (tokenData) {
      tokenData.isActive = false;
      await redisService.set(`${TOKEN_PREFIX}:${token}`, tokenData);

      // Remove from wallet's token set
      await redisService.getClient().srem(
        `${WALLET_TOKENS_PREFIX}:${tokenData.walletAddress}`,
        token
      );
    }

    logger.info(`Marked token as invalid: ${token.substring(0, 20)}...`);
  }

  /**
   * Send a notification to a wallet address
   * 
   * @param walletAddress - Target wallet address
   * @param notification - Notification payload
   * @param immediate - Whether to send immediately (true) or queue (false)
   * @returns Array of Expo push tickets
   */
  async sendToWallet(
    walletAddress: string,
    notification: NotificationPayload,
    immediate: boolean = true
  ): Promise<ExpoPushTicket[]> {
    const tokens = await this.getTokensForWallet(walletAddress);

    if (tokens.length === 0) {
      logger.warn(`No active tokens found for wallet ${walletAddress}`);
      return [];
    }

    const tokenStrings = tokens.map(t => t.token);

    if (immediate) {
      return this.sendBatch(tokenStrings, notification);
    } else {
      await this.queueNotification(tokenStrings, notification);
      return [{ status: 'ok', id: 'queued' }];
    }
  }

  /**
   * Send notifications to multiple wallet addresses
   * 
   * @param walletAddresses - Array of wallet addresses
   * @param notification - Notification payload
   * @returns Map of wallet address to tickets
   */
  async sendToWallets(
    walletAddresses: string[],
    notification: NotificationPayload
  ): Promise<Map<string, ExpoPushTicket[]>> {
    const results = new Map<string, ExpoPushTicket[]>();

    for (const wallet of walletAddresses) {
      const tickets = await this.sendToWallet(wallet, notification, true);
      results.set(wallet, tickets);
    }

    return results;
  }

  /**
   * Send a batch of notifications
   * 
   * @param tokens - Array of Expo push tokens
   * @param notification - Notification payload
   * @returns Array of Expo push tickets
   */
  async sendBatch(
    tokens: string[],
    notification: NotificationPayload
  ): Promise<ExpoPushTicket[]> {
    if (tokens.length === 0) {
      return [];
    }

    // Filter out invalid tokens
    const validTokens: string[] = [];
    for (const token of tokens) {
      if (await this.isInvalidToken(token)) {
        continue;
      }
      if (!Expo.isExpoPushToken(token)) {
        await this.markTokenInvalid(token);
        continue;
      }
      validTokens.push(token);
    }

    if (validTokens.length === 0) {
      logger.warn('No valid tokens to send to after filtering');
      return [];
    }

    // Build Expo push messages
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      subtitle: notification.subtitle,
      badge: notification.badge,
      priority: notification.priority === 'high' ? 'high' : 'default',
      data: notification.data || {},
      channelId: 'default',
    }));

    // Chunk messages (Expo allows max 100 per request)
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Update stats
        await this.incrementStat('sent', ticketChunk.length);

        // Process tickets to check for errors
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const message = chunk[i];

          if (ticket.status === 'error') {
            await this.incrementStat('failed', 1);
            logger.error(`Push notification failed: ${ticket.message}`, {
              details: ticket.details,
              token: message.to?.toString().substring(0, 20) + '...',
            });

            // Handle specific error types
            if (ticket.details?.error === 'DeviceNotRegistered') {
              if (message.to) {
                await this.markTokenInvalid(message.to as string);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error sending push notification batch:', error);
        await this.incrementStat('failed', chunk.length);
      }
    }

    logger.info(`Sent ${tickets.length} notifications, ${tickets.filter(t => t.status === 'error').length} failures`);

    return tickets;
  }

  /**
   * Queue a notification for later sending
   * 
   * @param tokens - Target tokens
   * @param payload - Notification payload
   * @param scheduledFor - Optional scheduled time
   * @returns The queued notification ID
   */
  async queueNotification(
    tokens: string[],
    payload: NotificationPayload,
    scheduledFor?: Date
  ): Promise<string> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const queued: QueuedNotification = {
      id,
      tokens,
      payload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
      scheduledFor: scheduledFor?.toISOString(),
    };

    // Add to queue
    await redisService.getClient().lpush(QUEUE_KEY, JSON.stringify(queued));

    logger.info(`Queued notification ${id} for ${tokens.length} recipients`);

    return id;
  }

  /**
   * Process the notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const batchSize = config.notifications.batchSize;
      const items = await redisService.getClient().lrange(QUEUE_KEY, 0, batchSize - 1);

      if (items.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Remove processed items from queue
      await redisService.getClient().ltrim(QUEUE_KEY, items.length, -1);

      for (const item of items) {
        try {
          const notification: QueuedNotification = JSON.parse(item);

          // Check if scheduled for later
          if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
            // Re-queue for later
            await redisService.getClient().rpush(QUEUE_KEY, item);
            continue;
          }

          // Check retry limit
          if (notification.attempts >= config.notifications.maxRetries) {
            logger.error(`Notification ${notification.id} exceeded max retries, discarding`);
            await this.incrementStat('failed', notification.tokens.length);
            continue;
          }

          // Send notification
          const tickets = await this.sendBatch(notification.tokens, notification.payload);

          // Check for failures to retry
          const failedTokens: string[] = [];
          for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            if (ticket.status === 'error') {
              // Don't retry DeviceNotRegistered errors
              if (ticket.details?.error !== 'DeviceNotRegistered') {
                failedTokens.push(notification.tokens[i]);
              }
            }
          }

          // Re-queue failed tokens
          if (failedTokens.length > 0) {
            const retry: QueuedNotification = {
              ...notification,
              tokens: failedTokens,
              attempts: notification.attempts + 1,
            };

            // Delay retry
            setTimeout(async () => {
              await redisService.getClient().rpush(QUEUE_KEY, JSON.stringify(retry));
            }, config.notifications.retryDelayMs);

            logger.info(`Re-queued ${failedTokens.length} failed tokens for retry`);
          }
        } catch (error) {
          logger.error('Error processing queued notification:', error);
        }
      }
    } catch (error) {
      logger.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start the background queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      this.processQueue().catch(error => {
        logger.error('Queue processor error:', error);
      });
    }, 5000);

    logger.info('Notification queue processor started');
  }

  /**
   * Increment notification statistics
   */
  private async incrementStat(type: 'sent' | 'failed', count: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `${STATS_KEY}:${today}`;
    
    await redisService.getClient().hincrby(key, type, count);
    await redisService.expire(key, 7 * 24 * 60 * 60); // 7 days expiration
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStats> {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `${STATS_KEY}:${today}`;

    // Count total tokens (scan all token keys)
    let totalTokens = 0;
    const tokenPattern = `${TOKEN_PREFIX}:*`;
    let cursor = '0';
    
    do {
      const result = await redisService.getClient().scan(
        cursor,
        'MATCH',
        tokenPattern,
        'COUNT',
        100
      );
      cursor = result[0];
      totalTokens += result[1].length;
    } while (cursor !== '0');

    // Count unique wallets
    const walletPattern = `${WALLET_TOKENS_PREFIX}:*`;
    let uniqueWallets = 0;
    cursor = '0';
    
    do {
      const result = await redisService.getClient().scan(
        cursor,
        'MATCH',
        walletPattern,
        'COUNT',
        100
      );
      cursor = result[0];
      uniqueWallets += result[1].length;
    } while (cursor !== '0');

    // Get queue size
    const queueSize = await redisService.getClient().llen(QUEUE_KEY);

    // Get today's stats
    const todayStats = await redisService.getClient().hgetall(statsKey);

    return {
      totalTokens,
      uniqueWallets,
      queueSize,
      sentToday: parseInt(todayStats.sent || '0', 10),
      failedToday: parseInt(todayStats.failed || '0', 10),
    };
  }

  /**
   * Create a notification payload for common scenarios
   */
  createPayload(
    type: NotificationType,
    title: string,
    body: string,
    data?: Partial<NotificationData>,
    priority: NotificationPriority = 'normal'
  ): NotificationPayload {
    const baseData: NotificationData = {
      type,
      ...data,
    };

    return {
      title,
      body,
      priority,
      data: baseData,
    };
  }

  /**
   * Create a task update notification
   */
  createTaskNotification(
    taskId: string,
    status: 'accepted' | 'completed' | 'cancelled' | 'updated',
    taskTitle?: string
  ): NotificationPayload {
    const statusMessages: Record<string, { title: string; body: string }> = {
      accepted: {
        title: 'Task Accepted',
        body: `Your task "${taskTitle || 'Untitled'}" has been accepted by an agent.`,
      },
      completed: {
        title: 'Task Completed',
        body: `Your task "${taskTitle || 'Untitled'}" has been completed.`,
      },
      cancelled: {
        title: 'Task Cancelled',
        body: `Your task "${taskTitle || 'Untitled'}" has been cancelled.`,
      },
      updated: {
        title: 'Task Updated',
        body: `Your task "${taskTitle || 'Untitled'}" has been updated.`,
      },
    };

    const message = statusMessages[status];

    return this.createPayload(
      `task_${status}` as NotificationType,
      message.title,
      message.body,
      { taskId, screen: 'TaskDetail' },
      'normal'
    );
  }

  /**
   * Create an agent message notification
   */
  createAgentMessageNotification(
    agentId: string,
    agentName: string,
    message: string
  ): NotificationPayload {
    return this.createPayload(
      'agent_message',
      `Message from ${agentName}`,
      message,
      { agentId, screen: 'AgentChat' },
      'normal'
    );
  }

  /**
   * Create a system alert notification
   */
  createSystemAlert(
    title: string,
    body: string,
    priority: NotificationPriority = 'high'
  ): NotificationPayload {
    return this.createPayload(
      'system_alert',
      title,
      body,
      { screen: 'Home' },
      priority
    );
  }

  /**
   * Create a payment notification
   */
  createPaymentNotification(
    amount: string,
    token: string,
    from?: string
  ): NotificationPayload {
    return this.createPayload(
      'payment_received',
      'Payment Received',
      `You received ${amount} ${token}${from ? ` from ${from}` : ''}`,
      { screen: 'Wallet' },
      'normal'
    );
  }

  /**
   * Create a bridge completion notification
   */
  createBridgeCompleteNotification(
    _txHash: string,
    amount: string,
    token: string,
    chain: string
  ): NotificationPayload {
    return this.createPayload(
      'bridge_complete',
      'Bridge Complete',
      `Your ${amount} ${token} bridge to ${chain} is complete`,
      { screen: 'Wallet' },
      'normal'
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
