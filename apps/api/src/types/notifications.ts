/**
 * Notification types for the Agora push notification system
 * @module types/notifications
 */

/**
 * Supported notification types
 */
export type NotificationType = 
  | 'task_update'
  | 'agent_message'
  | 'system_alert'
  | 'task_accepted'
  | 'task_completed'
  | 'task_cancelled'
  | 'payment_received'
  | 'bridge_complete'
  | 'agent_created';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'high' | 'normal' | 'low';

/**
 * Push token data stored in Redis
 */
export interface PushToken {
  /** The Expo push token */
  token: string;
  /** Wallet address associated with this token */
  walletAddress: string;
  /** Device platform */
  platform: 'ios' | 'android' | 'web';
  /** When the token was registered */
  registeredAt: string;
  /** Last used timestamp */
  lastUsedAt?: string;
  /** Whether the token is active */
  isActive: boolean;
}

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Optional subtitle (iOS only) */
  subtitle?: string;
  /** Sound to play */
  sound?: 'default' | string;
  /** Badge count (iOS only) */
  badge?: number;
  /** Priority level */
  priority?: NotificationPriority;
  /** Data payload for deep linking */
  data?: NotificationData;
}

/**
 * Data payload attached to notifications for deep linking
 */
export interface NotificationData {
  /** Notification type */
  type: NotificationType;
  /** Target screen/route */
  screen?: string;
  /** Entity IDs for navigation */
  taskId?: string;
  agentId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Request body for registering a push token
 */
export interface RegisterTokenRequest {
  /** The Expo push token */
  token: string;
  /** Wallet address to associate with the token */
  walletAddress: string;
  /** Device platform */
  platform?: 'ios' | 'android' | 'web';
}

/**
 * Request body for unregistering a push token
 */
export interface UnregisterTokenRequest {
  /** The Expo push token to remove */
  token: string;
}

/**
 * Request body for sending a notification
 */
export interface SendNotificationRequest {
  /** Target wallet address(es) */
  walletAddresses: string | string[];
  /** Notification content */
  notification: NotificationPayload;
  /** Whether to send immediately or queue */
  immediate?: boolean;
}

/**
 * Request body for batch sending notifications
 */
export interface BatchNotificationRequest {
  /** Array of notifications to send */
  notifications: Array<{
    walletAddress: string;
    notification: NotificationPayload;
  }>;
}

/**
 * Response from Expo Push API
 */
export interface ExpoPushTicket {
  /** Ticket ID for receipt checking */
  id?: string;
  /** Error status */
  status?: 'ok' | 'error';
  /** Error details if failed */
  details?: {
    error?: string;
    fault?: string;
  };
  /** Error message */
  message?: string;
}

/**
 * Expo Push Receipt
 */
export interface ExpoPushReceipt {
  /** Receipt status */
  status: 'ok' | 'error';
  /** Error details if failed */
  details?: {
    error?: string;
    fault?: string;
  };
  /** Error message */
  message?: string;
}

/**
 * Internal notification queue item
 */
export interface QueuedNotification {
  /** Unique notification ID */
  id: string;
  /** Target tokens */
  tokens: string[];
  /** Notification payload */
  payload: NotificationPayload;
  /** Number of retry attempts */
  attempts: number;
  /** When the notification was queued */
  queuedAt: string;
  /** Scheduled send time */
  scheduledFor?: string;
}

/**
 * Notification service configuration
 */
export interface NotificationConfig {
  /** Expo access token */
  expoAccessToken: string;
  /** Redis queue prefix */
  queuePrefix: string;
  /** Batch size for sending */
  batchSize: number;
  /** Max retry attempts */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelayMs: number;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  /** Total tokens registered */
  totalTokens: number;
  /** Unique wallet addresses */
  uniqueWallets: number;
  /** Queue size */
  queueSize: number;
  /** Notifications sent today */
  sentToday: number;
  /** Failed notifications today */
  failedToday: number;
}
