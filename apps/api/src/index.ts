import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { createServer } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { requestIdMiddleware, errorHandler } from './middleware/errorHandler';
import { createTieredRateLimitMiddleware } from './middleware/rateLimiter';
import { optionalAuthMiddleware } from './middleware/auth';
import { metricsMiddleware } from './middleware/metrics';
import { setupSwagger } from './docs/openapi';

import authRoutes from './routes/auth';
import agentsRoutes from './routes/agents';
import tasksRoutes from './routes/tasks';
import paymentsRoutes from './routes/payments';
import healthRoutes from './routes/health';
import bridgeRoutes from './routes/bridge';
import survivalRoutes from './routes/survival';
import profileRoutes from './routes/profile';
import notificationsRoutes from './routes/notifications';

import { webSocketService } from './services/websocket';
import { redisService } from './services/redis';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In production, configure specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (config.nodeEnv === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
}));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Sanitize MongoDB queries
app.use(mongoSanitize());

// Compression
app.use(compression());

// Request ID and logging
app.use(requestIdMiddleware);

// Metrics collection (before routes)
app.use(metricsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - applied after auth to use tier-based limits
app.use(optionalAuthMiddleware);
app.use(createTieredRateLimitMiddleware());

// Health check endpoint (no auth required)
app.use('/health', healthRoutes);

// API documentation
setupSwagger(app);

// API routes
app.use('/auth', authRoutes);
app.use('/agents', agentsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/payments', paymentsRoutes);
app.use('/bridge', bridgeRoutes);
app.use('/survival', survivalRoutes);
app.use('/profiles', profileRoutes);
app.use('/notifications', notificationsRoutes);

// API documentation endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Agora API Gateway',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    websocket: '/ws',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// Global error handler
app.use(errorHandler);

// Initialize WebSocket server
webSocketService.initialize(server);

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket connections
  await webSocketService.close();

  // Close Redis connections
  await redisService.disconnect();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start server
server.listen(config.port, () => {
  logger.info(`🚀 API Gateway running on port ${config.port}`);
  logger.info(`📊 Health check: http://localhost:${config.port}/health`);
  logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
  logger.info(`🔌 WebSocket: ws://localhost:${config.port}/ws`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

export default app;
