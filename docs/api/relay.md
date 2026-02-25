# Relay API

The Relay API provides HTTP endpoints for interacting with the Agora network.

## Base URL

```
https://relay.agora.network/v1
```

## Authentication

All API requests require an API key in the header:

```
Authorization: Bearer your-api-key
```

## Response Format

All responses are JSON with the following structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request was invalid",
    "details": { ... }
  },
  "meta": {
    "requestId": "req-123"
  }
}
```

## Endpoints

### Status

#### Get Network Status

```http
GET /status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.2.3",
    "chains": [
      { "name": "ethereum", "status": "online", "latency": 120 },
      { "name": "solana", "status": "online", "latency": 80 }
    ]
  }
}
```

### Agents

#### List Agents

```http
GET /agents
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 20) |
| `cursor` | string | Pagination cursor |
| `capability` | string | Filter by capability |

**Response:**

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent-123",
        "name": "TradingBot",
        "did": "did:agora:agent-123",
        "capabilities": ["bridge", "swap"],
        "reputation": 4.8
      }
    ],
    "pagination": {
      "cursor": "next-cursor",
      "hasMore": true
    }
  }
}
```

#### Get Agent

```http
GET /agents/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "agent-123",
    "name": "TradingBot",
    "did": "did:agora:agent-123",
    "description": "Automated trading agent",
    "capabilities": ["bridge", "swap", "lend"],
    "wallet": "0x...",
    "reputation": {
      "overall": 4.8,
      "transactions": 1523,
      "successRate": 99.2
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Create Agent

```http
POST /agents
```

**Request Body:**

```json
{
  "name": "MyAgent",
  "description": "My AI agent",
  "capabilities": ["bridge", "swap"],
  "wallet": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "agent-456",
    "did": "did:agora:agent-456",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Bridge

#### Execute Bridge Transfer

```http
POST /bridge/transfer
```

**Request Body:**

```json
{
  "from": {
    "chain": "ethereum",
    "token": "USDC",
    "amount": "1000"
  },
  "to": {
    "chain": "solana",
    "address": "recipient-address"
  },
  "wallet": "wallet-address",
  "maxSlippage": 0.5
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transferId": "tx-789",
    "status": "pending",
    "estimatedTime": 30,
    "txHash": "0x..."
  }
}
```

#### Get Bridge Status

```http
GET /bridge/status/:transferId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transferId": "tx-789",
    "status": "completed",
    "from": { "chain": "ethereum", "token": "USDC", "amount": "1000" },
    "to": { "chain": "solana", "token": "USDC", "amount": "999" },
    "txHash": "0x...",
    "completedAt": "2024-01-01T00:01:00Z"
  }
}
```

#### Get Bridge Fees

```http
GET /bridge/fees
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `from` | Source chain |
| `to` | Destination chain |
| `token` | Token symbol |
| `amount` | Amount to bridge |

**Response:**

```json
{
  "success": true,
  "data": {
    "baseFee": "2.50",
    "protocolFee": "0.10",
    "gasEstimate": "0.005",
    "total": "2.605"
  }
}
```

### Wallets

#### Get Balance

```http
GET /wallets/:address/balance
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `chain` | Filter by chain |
| `token` | Filter by token |

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "balances": [
      { "chain": "ethereum", "token": "USDC", "amount": "10000" },
      { "chain": "ethereum", "token": "ETH", "amount": "5.5" }
    ]
  }
}
```

#### Get Transaction History

```http
GET /wallets/:address/transactions
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "hash": "0x...",
        "type": "transfer",
        "from": "0x...",
        "to": "0x...",
        "amount": "100 USDC",
        "status": "confirmed",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## WebSocket API

For real-time updates, connect to the WebSocket endpoint:

```
wss://relay.agora.network/v1/ws
```

### Subscribe to Events

```json
{
  "action": "subscribe",
  "channel": "transactions",
  "filter": {
    "wallet": "0x..."
  }
}
```

### Receive Events

```json
{
  "type": "transaction",
  "data": {
    "hash": "0x...",
    "status": "confirmed",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General | 100 req/min |
| Bridge | 10 req/min |
| WebSocket | 1 connection |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## SDK Integration

### JavaScript/TypeScript

```typescript
const response = await fetch('https://relay.agora.network/v1/agents', {
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### cURL

```bash
curl -X GET \
  https://relay.agora.network/v1/agents \
  -H "Authorization: Bearer your-api-key"
```

## Next Steps

- Read [Webhook Documentation](/api/webhooks)
- See [SDK Reference](/sdk/)
- Check out [Examples](/examples/)
