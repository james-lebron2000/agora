# Connection Pooling with PgBouncer

This document explains the connection pooling setup for the Agora database infrastructure.

## Why PgBouncer?

PostgreSQL connections are expensive resources. Each connection consumes:
- ~10MB memory per connection
- A dedicated backend process
- Network overhead

With serverless/lambda architectures or high-concurrency applications, connection pooling is essential to:
- Reduce connection overhead
- Prevent connection exhaustion
- Improve query latency
- Support more concurrent clients

## Architecture

```
┌─────────────────┐
│   Application   │
│  (Prisma Client)│
└────────┬────────┘
         │ DATABASE_URL (PgBouncer)
         │ port 6432
         ▼
┌─────────────────┐
│   PgBouncer     │  ← Connection Pool
│  (Transaction   │     20-100 connections
│    Pooling)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← Actual Database
│   Primary       │     max_connections: 200
└────────┬────────┘
         │ Streaming Replication
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← Read Replica
│    Replica      │     Read-only queries
└─────────────────┘
```

## Pool Modes

### Transaction Pooling (Recommended)

PgBouncer assigns a server connection for each transaction.

**Pros:**
- Most efficient mode
- Supports most PostgreSQL features
- Best for web applications

**Cons:**
- Session features don't work (PREPARE, LISTEN/NOTIFY)
- Prisma requires `pgbouncer=true` mode

### Session Pooling

Server connection assigned for entire client session.

**Pros:**
- Full PostgreSQL feature support
- Simple to understand

**Cons:**
- Less efficient than transaction pooling
- Can still exhaust connections

## Configuration

### PgBouncer Settings

```yaml
# PgBouncer Configuration
pool_mode: transaction
default_pool_size: 20        # Connections per database/user
min_pool_size: 5             # Keep warm connections
reserve_pool_size: 5         # Emergency connections
reserve_pool_timeout: 3      # Seconds to wait for reserve
server_idle_timeout: 600     # Close idle connections
server_lifetime: 3600        # Max connection lifetime
max_client_conn: 10000       # Max client connections
```

### Prisma Configuration

```typescript
// Schema
 datasource db {
   provider = "postgresql"
   url      = env("DATABASE_URL")  // PgBouncer URL
   directUrl = env("DIRECT_URL")   // Direct for migrations
 }
```

```bash
# .env
# Application queries (through PgBouncer)
DATABASE_URL="postgresql://user:pass@localhost:6432/db?pgbouncer=true"

# Direct connection for migrations/introspection
DIRECT_URL="postgresql://user:pass@localhost:5432/db"
```

## Connection Strings

### Direct PostgreSQL
```
postgresql://agora:agora_secret@localhost:5432/agora
```
- Use for: Migrations, introspection, admin operations
- Connection limit: 200 (from PostgreSQL config)

### Through PgBouncer
```
postgresql://agora:agora_secret@localhost:6432/agora?pgbouncer=true
```
- Use for: Application queries
- Connection limit: 10,000 (client connections)
- Pool size: 20 connections to PostgreSQL

### Read Replica
```
postgresql://agora:agora_secret@localhost:5433/agora
```
- Use for: Read-heavy queries
- Offloads primary database

## Prisma Client Setup

```typescript
import { PrismaClient } from '@prisma/client';

// Standard setup - PgBouncer compatible
const prisma = new PrismaClient();

// With explicit PgBouncer config
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // PgBouncer URL
    },
  },
});
```

## Read/Write Splitting

```typescript
import { createPrismaClientWithReplicas } from '@agora/database';

const { primary, replica } = createPrismaClientWithReplicas({
  primary: { url: process.env.DATABASE_URL },
  replicas: [
    { url: process.env.READ_REPLICA_URL, location: 'us-east' },
  ],
});

// Writes go to primary
await primary.user.create({ data: {...} });

// Reads can go to replica
const users = await replica.user.findMany();
```

## Monitoring

### Check PgBouncer Stats

```bash
# Connect to PgBouncer admin console
psql -p 6432 pgbouncer -U agora

# Show pool stats
SHOW pools;

# Show active clients
SHOW clients;

# Show active servers
SHOW servers;

# Show stats
SHOW stats;
```

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| cl_active | Active clients | < 80% of max |
| sv_active | Active servers | < pool_size |
| sv_idle | Idle servers | > min_pool_size |
| maxwait | Max wait time | < 1s |

### Prisma Query Metrics

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

## Best Practices

### 1. Use Transaction Pooling
- Most efficient for web applications
- Prisma is fully compatible

### 2. Set Appropriate Pool Sizes
```
PgBouncer pool_size = 20
PostgreSQL max_connections = 200

This allows ~10 PgBouncer instances
or other connections (monitoring, migrations, etc.)
```

### 3. Use Direct URL for Migrations
```bash
# Always use direct connection for migrations
npx prisma migrate deploy

# Uses DIRECT_URL from .env
```

### 4. Handle Connection Errors
```typescript
try {
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  if (error.code === 'P1001') {
    // Can't reach database server
  }
  if (error.code === 'P1002') {
    // Timeout
  }
}
```

### 5. Graceful Shutdown
```typescript
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## Troubleshooting

### "Prepared statement already exists"

This happens with session pooling. Solutions:
1. Switch to transaction pooling
2. Add `?pgbouncer=true` to connection string
3. Disable prepared statements in Prisma

### Connection Exhaustion

Symptoms: `FATAL: sorry, too many clients already`

Solutions:
1. Increase PgBouncer pool_size
2. Increase PostgreSQL max_connections
3. Check for connection leaks
4. Add application-side connection limiting

### High Latency

Symptoms: Queries take longer than expected

Check:
```bash
# PgBouncer wait times
psql -p 6432 pgbouncer -c "SHOW pools;" | grep maxwait

# If maxwait > 0, increase pool_size
```

## Load Testing

```bash
# Install pgbench
# Test direct PostgreSQL
pgbench -h localhost -p 5432 -U agora -c 50 -j 10 -t 1000 agora

# Test through PgBouncer
pgbench -h localhost -p 6432 -U agora -c 1000 -j 50 -t 1000 agora
```

## Further Reading

- [Prisma + PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
- [PostgreSQL Connection Scaling](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
