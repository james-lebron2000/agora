# @agora/database

PostgreSQL database package for the Agora platform with Prisma ORM, connection pooling via PgBouncer, and read replica support.

## Features

- **Prisma ORM** - Type-safe database client with full-text search support
- **PgBouncer** - Connection pooling for efficient database resource usage
- **Read Replicas** - Automatic read/write splitting for performance
- **Migrations** - Version-controlled schema migrations
- **Seed Data** - Comprehensive test data for development
- **Backup/Restore** - Automated backup scripts with S3 support

## Schema Overview

### Core Entities

| Entity | Description |
|--------|-------------|
| `User` | Platform users with wallet authentication |
| `Agent` | AI agents with runtime configuration |
| `Task` | Agent execution tasks with status tracking |
| `Payment` | Crypto payments with blockchain integration |

### Supporting Entities

- `AgentVersion` - Version control for agent configurations
- `AgentReview` - User ratings and reviews
- `TaskLog` - Execution logs for debugging
- `UserSession` - Authentication sessions
- `SystemConfig` - Platform configuration
- `AuditLog` - Compliance and audit trails
- `JobQueue` - Background job processing
- `RateLimit` - Rate limiting storage

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, PgBouncer, and Redis
docker-compose up -d

# Or with PgAdmin for database management
docker-compose --profile pgadmin up -d
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Run Migrations

```bash
# Development (creates migrations)
npm run db:migrate

# Production (applies migrations)
npm run db:migrate:prod
```

### 6. Seed Database

```bash
npm run db:seed
```

### 7. Open Prisma Studio

```bash
npm run db:studio
```

## Connection Configuration

### Direct Connection (Migrations)

```
postgresql://user:pass@localhost:5432/agora
```

### PgBouncer Connection (Application)

```
postgresql://user:pass@localhost:6432/agora?pgbouncer=true
```

### Read Replica

```
postgresql://user:pass@localhost:5433/agora
```

## Usage

### Basic Query

```typescript
import { prisma, checkDatabaseHealth } from '@agora/database';

// Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    walletAddress: '0x123...',
    role: 'USER',
  },
});

// Find agents
const agents = await prisma.agent.findMany({
  where: { status: 'ACTIVE', isListed: true },
  orderBy: { rating: 'desc' },
  take: 10,
});

// Health check
const health = await checkDatabaseHealth();
console.log(health.healthy ? 'DB OK' : 'DB Error');
```

### With Read Replicas

```typescript
import { createPrismaClientWithReplicas } from '@agora/database';

const { primary, replica } = createPrismaClientWithReplicas({
  primary: { url: process.env.DATABASE_URL },
  replicas: [{ url: process.env.READ_REPLICA_URL }],
});

// Write to primary
await primary.user.create({ data: {...} });

// Read from replica
const users = await replica.user.findMany();
```

### Transactions

```typescript
import { runTransaction } from '@agora/database';

await runTransaction(async (tx) => {
  const payment = await tx.payment.create({ data: {...} });
  await tx.task.update({
    where: { id: taskId },
    data: { paymentId: payment.id },
  });
});
```

## Backup & Restore

### Create Backup

```bash
# Full backup
./scripts/backup.sh

# Schema only
./scripts/backup.sh --schema-only

# Custom directory
./scripts/backup.sh -d /mnt/backups

# With S3 upload (if configured)
export S3_BACKUP_BUCKET=my-backups
./scripts/backup.sh
```

### Restore Backup

```bash
# List available backups
./scripts/restore.sh -l

# Restore specific backup
./scripts/restore.sh agora_backup_20240208_120000

# Restore from S3
./scripts/restore.sh --from-s3 agora-backups/latest.dump

# Clean restore (drop first)
./scripts/restore.sh backup.dump --clean

# Restore specific tables
./scripts/restore.sh backup.dump --tables users,agents
```

### Automated Backups

Add to crontab for daily backups:

```bash
0 2 * * * /path/to/agora/packages/database/scripts/backup.sh >> /var/log/agora-backup.log 2>&1
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:migrate:prod` | Apply migrations (production) |
| `npm run db:seed` | Seed with test data |
| `npm run db:reset` | Reset database and re-run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:push` | Push schema without migration |
| `npm run db:backup` | Run backup script |
| `npm run db:restore` | Run restore script |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| postgres-primary | 5432 | Main PostgreSQL instance |
| postgres-replica | 5433 | Read replica (optional) |
| pgbouncer | 6432 | Connection pooler |
| redis | 6379 | Cache & sessions |
| pgadmin | 5050 | Database admin UI |

## Environment Variables

### Required

- `DATABASE_URL` - PgBouncer connection URL
- `DIRECT_URL` - Direct PostgreSQL connection

### Optional

- `SHADOW_DATABASE_URL` - For Prisma migrations
- `READ_REPLICA_URL` - Read replica connection
- `S3_BACKUP_BUCKET` - S3 bucket for backups
- `BACKUP_RETENTION_DAYS` - Backup retention (default: 30)

## Database Migrations

### Create Migration

```bash
npx prisma migrate dev --name add_user_preferences
```

### Apply Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

### Reset Database

```bash
npx prisma migrate reset
```

## Troubleshooting

### Connection Issues

```bash
# Check PgBouncer status
docker-compose logs pgbouncer

# Test direct connection
psql postgresql://agora:agora_secret@localhost:5432/agora

# Test PgBouncer connection
psql postgresql://agora:agora_secret@localhost:6432/agora
```

### Migration Failures

```bash
# Check migration status
npx prisma migrate status

# Resolve issues
npx prisma migrate resolve --rolled-back "migration_name"
```

### Reset Everything

```bash
docker-compose down -v
docker-compose up -d
npm run db:migrate
npm run db:seed
```
