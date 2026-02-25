# API Gateway

Production-ready API Gateway for the Agora platform.

## Features

- **Rate Limiting**: Redis-backed distributed rate limiting with multiple tiers
- **Authentication**: API key + JWT token validation
- **Route Aggregation**: Unified endpoints for /agents, /tasks, /payments
- **WebSocket**: Real-time bidirectional communication
- **Redis Caching**: High-performance response caching
- **Security**: Helmet, CORS, compression, input sanitization

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Services
AGENTS_SERVICE_URL=http://agents:3001
TASKS_SERVICE_URL=http://tasks:3002
PAYMENTS_SERVICE_URL=http://payments:3003
```

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /health/detailed` - Detailed health with dependencies

### Authentication
- `POST /auth/token` - Exchange API key for JWT
- `POST /auth/refresh` - Refresh JWT token
- `DELETE /auth/token` - Revoke token

### Agents
- `GET /agents` - List agents
- `POST /agents` - Create agent
- `GET /agents/:id` - Get agent
- `PUT /agents/:id` - Update agent
- `DELETE /agents/:id` - Delete agent
- `POST /agents/:id/execute` - Execute agent task

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

## WebSocket Events

### Client → Server
- `subscribe:agent` - Subscribe to agent updates
- `subscribe:task` - Subscribe to task updates
- `unsubscribe` - Unsubscribe from updates

### Server → Client
- `agent:update` - Agent state update
- `task:update` - Task progress update
- `error` - Error notification

## Rate Limits

| Tier | Requests/Window | Window |
|------|----------------|--------|
| Default | 100 | 15 min |
| Premium | 1000 | 15 min |
| Internal | Unlimited | - |

## Docker

```bash
docker build -t agora-api-gateway .
docker run -p 3000:3000 --env-file .env agora-api-gateway
```
