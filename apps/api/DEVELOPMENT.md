# API Gateway - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
npm start

# Run tests
npm test

# Docker
docker-compose up -d
```

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration management
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── rateLimiter.ts    # Rate limiting middleware
│   │   └── errorHandler.ts   # Global error handler
│   ├── routes/
│   │   ├── auth.ts           # Auth routes (/auth)
│   │   ├── agents.ts         # Agents routes (/agents)
│   │   ├── tasks.ts          # Tasks routes (/tasks)
│   │   ├── payments.ts       # Payments routes (/payments)
│   │   └── health.ts         # Health check routes (/health)
│   ├── services/
│   │   ├── redis.ts          # Redis service
│   │   ├── auth.ts           # Authentication service
│   │   └── websocket.ts      # WebSocket service
│   └── utils/
│       └── logger.ts         # Winston logger
├── tests/
│   ├── setup.ts              # Test setup
│   ├── auth.test.ts          # Auth tests
│   ├── rateLimiter.test.ts   # Rate limiter tests
│   └── errorHandler.test.ts  # Error handler tests
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `RATE_LIMIT_MAX_REQUESTS` | Default rate limit | 100 |
| `PREMIUM_RATE_LIMIT_MAX_REQUESTS` | Premium rate limit | 1000 |

## API Endpoints

### Authentication
- `POST /auth/token` - Exchange API key for JWT
- `POST /auth/refresh` - Refresh JWT token
- `DELETE /auth/token` - Revoke token
- `GET /auth/me` - Get current user

### Agents
- `GET /agents` - List agents
- `POST /agents` - Create agent
- `GET /agents/:id` - Get agent
- `PUT /agents/:id` - Update agent
- `DELETE /agents/:id` - Delete agent
- `POST /agents/:id/execute` - Execute agent

### Tasks
- `GET /tasks` - List tasks
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `POST /tasks/:id/cancel` - Cancel task

### Payments
- `GET /payments` - List payments
- `POST /payments` - Create payment
- `GET /payments/:id` - Get payment
- `POST /payments/:id/confirm` - Confirm payment

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with deps
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/ws` - WebSocket stats

## WebSocket Events

Connect to `ws://localhost:3000/ws`

### Client → Server
```json
{"type": "auth", "payload": {"token": "jwt-token"}}
{"type": "subscribe:task", "payload": {"taskId": "task-1"}}
{"type": "unsubscribe", "payload": {"channel": "task:task-1"}}
{"type": "ping"}
```

### Server → Client
```json
{"type": "connection:established", "payload": {"clientId": "..."}}
{"type": "task:updated", "payload": {"taskId": "...", "status": "..."}}
{"type": "pong", "payload": {"timestamp": 1234567890}}
```

## Demo API Key

Use this key for testing:
```
agora_demo_api_key_12345
```

## Architecture

```
┌─────────────────┐
│   API Gateway   │  ← Rate limiting, Auth, Routing
│   (Express)     │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┐
    ▼         ▼        ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌────────┐
│Agents │ │Tasks  │ │Payment│ │ WebSocket
│Service│ │Service│ │Service│ │ Server
└───────┘ └───────┘ └───────┘ └────────┘
    │         │        │          │
    └─────────┴────────┴──────────┘
              │
         ┌────┴────┐
         ▼         ▼
    ┌────────┐ ┌────────┐
    │ Redis  │ │  Pub   │
    │ Cache  │ │ /Sub   │
    └────────┘ └────────┘
```
