# Read Replicas Configuration

This document explains how to configure and use read replicas for the Agora database.

## Overview

Read replicas are copies of the primary PostgreSQL database that serve read-only queries. They help:

- **Scale read traffic** - Distribute queries across multiple servers
- **Reduce primary load** - Offload analytics and reporting
- **Improve latency** - Query replicas closer to users
- **High availability** - Failover if primary fails

## Architecture

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │    (Reads)       │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  Replica 1  │   │  Replica 2  │   │  Replica N  │
    │  us-east    │   │  us-west    │   │   eu-west   │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │ Streaming
                             │ Replication
                             ▼
                    ┌──────────────────┐
                    │     Primary      │
                    │   (Read/Write)   │
                    └──────────────────┘
```

## Docker Compose Setup

The provided `docker-compose.yml` includes a primary and replica configuration for local development:

```yaml
# Primary
postgres-primary:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: agora
    POSTGRES_PASSWORD: agora_secret
    POSTGRES_DB: agora
  ports:
    - "5432:5432"
  command:
    - "postgres"
    - "-c"
    - "wal_level=replica"
    - "-c"
    - "max_wal_senders=10"
    - "-c"
    - "hot_standby=on"

# Replica
postgres-replica:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: agora
    POSTGRES_PASSWORD: agora_secret
  ports:
    - "5433:5432"
  depends_on:
    - postgres-primary
```

## Configuration

### Primary Configuration

Key PostgreSQL settings for replication:

```conf
# wal_level must be replica or higher
wal_level = replica

# Number of concurrent connections from replicas
max_wal_senders = 10

# Number of replication slots
max_replication_slots = 10

# Enable hot standby (queries on replica)
hot_standby = on

# Minimum WAL size to keep
min_wal_size = 1GB

# Maximum WAL size before forcing checkpoint
max_wal_size = 4GB
```

### Replica Configuration

```conf
# Must be standby
hot_standby = on

# Recovery settings
restore_command = ''
standby_mode = on
primary_conninfo = 'host=primary port=5432 user=replicator password=secret'
```

## Environment Variables

```bash
# Primary database (writes + reads)
DATABASE_URL="postgresql://agora:agora_secret@localhost:6432/agora?pgbouncer=true"
DIRECT_URL="postgresql://agora:agora_secret@localhost:5432/agora"

# Read replica (reads only)
READ_REPLICA_URL="postgresql://agora:agora_secret@localhost:5433/agora"

# Multiple replicas (comma-separated)
READ_REPLICA_URLS="postgresql://...:5433/agora,postgresql://...:5434/agora"
```

## Code Implementation

### Basic Read/Write Splitting

```typescript
import { createPrismaClientWithReplicas } from '@agora/database';

const { primary, replica } = createPrismaClientWithReplicas({
  primary: { 
    url: process.env.DATABASE_URL 
  },
  replicas: [
    { url: process.env.READ_REPLICA_URL, location: 'local' }
  ]
});

// Writes always go to primary
async function createUser(data: CreateUserInput) {
  return primary.user.create({ data });
}

// Reads can go to replica
async function getUserById(id: string) {
  return replica.user.findUnique({ where: { id } });
}

async function searchAgents(query: string) {
  return replica.agent.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    }
  });
}
```

### Automatic Read Splitting

```typescript
import { PrismaClient } from '@prisma/client';

class DatabaseManager {
  private primary: PrismaClient;
  private replicas: PrismaClient[];
  private currentReplicaIndex = 0;

  constructor() {
    this.primary = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
    
    const replicaUrls = process.env.READ_REPLICA_URLS?.split(',') || [];
    this.replicas = replicaUrls.map(url => 
      new PrismaClient({ datasources: { db: { url } } })
    );
  }

  // Get primary for writes
  get write() {
    return this.primary;
  }

  // Get round-robin replica for reads
  get read() {
    if (this.replicas.length === 0) {
      return this.primary;
    }
    const replica = this.replicas[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicas.length;
    return replica;
  }

  // Health check all connections
  async healthCheck() {
    const results = [];
    
    // Check primary
    try {
      await this.primary.$queryRaw`SELECT 1`;
      results.push({ type: 'primary', healthy: true });
    } catch {
      results.push({ type: 'primary', healthy: false });
    }
    
    // Check replicas
    for (let i = 0; i < this.replicas.length; i++) {
      try {
        await this.replicas[i].$queryRaw`SELECT 1`;
        results.push({ type: 'replica', index: i, healthy: true });
      } catch {
        results.push({ type: 'replica', index: i, healthy: false });
      }
    }
    
    return results;
  }
}

export const db = new DatabaseManager();

// Usage
await db.write.user.create({ data: {...} });  // Primary
await db.read.user.findMany();                 // Replica (round-robin)
```

### Query-Based Routing

```typescript
// Automatically route based on query type
export const smartPrisma = new Proxy(prisma, {
  get(target, prop) {
    const operation = String(prop);
    
    // Write operations go to primary
    const writeOps = ['create', 'createMany', 'update', 'updateMany', 
                      'delete', 'deleteMany', 'upsert', 'transaction'];
    
    if (writeOps.some(op => operation.toLowerCase().includes(op))) {
      return target[prop];
    }
    
    // Read operations can go to replica
    if (replicaAvailable) {
      return replica[prop];
    }
    
    return target[prop];
  }
});
```

## Replication Lag

### Monitoring Lag

```sql
-- On primary: Check replication status
SELECT 
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as lag
FROM pg_stat_replication;

-- On replica: Check recovery status
SELECT 
  extract(epoch from (now() - pg_last_xact_replay_timestamp())) as lag_seconds,
  pg_last_xact_replay_timestamp() as last_replay;
```

### Handling Lag in Application

```typescript
async function readWithConsistencyCheck<T>(
  readFn: () => Promise<T>,
  writeFn: () => Promise<T>,
  maxLagMs = 1000
): Promise<T> {
  try {
    // Try replica first
    const result = await readFn();
    
    // If data might be stale, check timestamp
    if (isFreshEnough(result, maxLagMs)) {
      return result;
    }
    
    // Fallback to primary
    return await writeFn();
  } catch (error) {
    // On error, fallback to primary
    return await writeFn();
  }
}

// Usage for critical reads
const user = await readWithConsistencyCheck(
  () => replica.user.findUnique({ where: { id } }),
  () => primary.user.findUnique({ where: { id } })
);
```

## Read Replica Use Cases

### 1. Analytics & Reporting

```typescript
// Heavy aggregation queries go to replica
async function getDashboardStats() {
  return replica.$queryRaw`
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      COUNT(*) as task_count,
      SUM(amount) as total_volume
    FROM tasks
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `;
}
```

### 2. Search Queries

```typescript
// Full-text search on replica
async function searchAgents(query: string) {
  return replica.agent.findMany({
    where: {
      isListed: true,
      status: 'ACTIVE',
      OR: [
        { name: { search: query } },
        { description: { search: query } }
      ]
    },
    take: 50
  });
}
```

### 3. List Views

```typescript
// Pagination queries on replica
async function listAgents(page: number, limit: number) {
  return replica.agent.findMany({
    where: { isListed: true },
    orderBy: { rating: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: { owner: { select: { username: true } } }
  });
}
```

## Failover

### Automatic Failover with Health Checks

```typescript
class ReplicaManager {
  private replicas: Map<string, PrismaClient> = new Map();
  private healthyReplicas: string[] = [];

  constructor(replicaConfigs: { name: string; url: string }[]) {
    for (const config of replicaConfigs) {
      this.replicas.set(
        config.name,
        new PrismaClient({ datasources: { db: { url: config.url } } })
      );
    }
    
    // Start health check loop
    this.startHealthChecks();
  }

  private async startHealthChecks() {
    setInterval(async () => {
      const healthy: string[] = [];
      
      for (const [name, client] of this.replicas) {
        try {
          await client.$queryRaw`SELECT 1`;
          healthy.push(name);
        } catch {
          console.warn(`Replica ${name} is unhealthy`);
        }
      }
      
      this.healthyReplicas = healthy;
    }, 30000); // Check every 30s
  }

  getHealthyReplica(): PrismaClient | null {
    if (this.healthyReplicas.length === 0) return null;
    
    // Round-robin selection
    const name = this.healthyReplicas[0];
    this.healthyReplicas.push(this.healthyReplicas.shift()!);
    return this.replicas.get(name) || null;
  }
}
```

## Production Deployment

### AWS RDS Read Replicas

```typescript
// Configuration for AWS RDS
const config = {
  primary: {
    url: process.env.DATABASE_URL, // RDS Primary endpoint
  },
  replicas: [
    { 
      url: process.env.RDS_REPLICA_URL_1, // Read replica 1
      location: 'us-east-1a'
    },
    {
      url: process.env.RDS_REPLICA_URL_2, // Read replica 2
      location: 'us-east-1b'
    }
  ]
};
```

### Google Cloud SQL

```typescript
const config = {
  primary: {
    url: process.env.CLOUD_SQL_PRIMARY_URL,
  },
  replicas: [
    {
      url: process.env.CLOUD_SQL_REPLICA_URL,
      location: 'us-central1'
    }
  ]
};
```

## Monitoring

### Key Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| replication_lag | > 5 seconds | Time behind primary |
| replica_lag_bytes | > 100 MB | WAL bytes behind |
| replica_connections | > 80% | Connection utilization |
| replica_query_time | > 1 second | Slow query detection |

### Prometheus Metrics

```typescript
// Add to your monitoring
import { collectDefaultMetrics, register, Gauge } from 'prom-client';

const replicaLag = new Gauge({
  name: 'postgres_replication_lag_seconds',
  help: 'Replication lag in seconds',
  labelNames: ['replica']
});

// Update metric
const lag = await replica.$queryRaw<
  [{ lag_seconds: number }]
>`SELECT extract(epoch from (now() - pg_last_xact_replay_timestamp())) as lag_seconds`;

replicaLag.set({ replica: 'replica-1' }, lag[0].lag_seconds);
```

## Best Practices

1. **Always verify replica health** before routing reads
2. **Monitor replication lag** - Set alerts for > 10s lag
3. **Handle stale reads gracefully** - Fall back to primary if needed
4. **Use transactions for consistency** - Multi-statement reads in a transaction
5. **Don't rely on replicas for critical writes** - Always use primary
6. **Test failover scenarios** - Ensure app handles replica failures
