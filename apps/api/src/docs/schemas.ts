/**
 * Shared Zod schemas for API validation
 * These schemas are used for runtime validation and can be converted to OpenAPI schemas
 * @module docs/schemas
 */

import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const tokenRequestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const userInfoSchema = z.object({
  id: z.string(),
  tier: z.enum(['default', 'premium', 'internal']),
  permissions: z.array(z.string()),
});

// ============================================================================
// Agent Schemas
// ============================================================================

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['chat', 'task', 'workflow']),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'paused']).optional(),
});

export const agentExecutionSchema = z.object({
  input: z.unknown(),
  context: z.record(z.unknown()).optional(),
});

// ============================================================================
// Task Schemas
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  deadline: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  metadata: z.record(z.unknown()).optional(),
  deadline: z.string().datetime().optional(),
});

export const taskFilterSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  callbackUrl: z.string().url().optional(),
});

export const paymentFilterSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

// ============================================================================
// Bridge Schemas
// ============================================================================

export const bridgeTransactionSchema = z.object({
  sourceChain: z.string(),
  targetChain: z.string(),
  tokenAddress: z.string(),
  amount: z.string(),
  recipient: z.string(),
  slippage: z.number().min(0).max(100).default(1),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const createNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  priority: z.enum(['normal', 'high']).default('normal'),
  recipients: z.array(z.string()).min(1),
});

export const registerDeviceSchema = z.object({
  token: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  preferences: z.record(z.unknown()).optional(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type CreateAgentRequest = z.infer<typeof createAgentSchema>;
export type UpdateAgentRequest = z.infer<typeof updateAgentSchema>;
export type CreateTaskRequest = z.infer<typeof createTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type BridgeTransactionRequest = z.infer<typeof bridgeTransactionSchema>;
export type CreateNotificationRequest = z.infer<typeof createNotificationSchema>;
export type RegisterDeviceRequest = z.infer<typeof registerDeviceSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
