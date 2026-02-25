# Quick Start Guide

Get the Agora database up and running in 5 minutes.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- pnpm or npm

## 1. Install Dependencies

```bash
cd packages/database
npm install
```

## 2. Setup Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

## 3. Start Services

```bash
# Using Make
make up

# Or with Docker Compose directly
docker-compose up -d
```

Wait for services to start:
```bash
make test
```

## 4. Run Migrations

```bash
npx prisma migrate dev --name init
```

## 5. Seed Database

```bash
npm run db:seed
```

## 6. Open Prisma Studio

```bash
npm run db:studio
```

Access at: http://localhost:5555

## Services Overview

| Service | URL/Port | Description |
|---------|----------|-------------|
| PostgreSQL | localhost:5432 | Main database |
| PgBouncer | localhost:6432 | Connection pooler |
| Redis | localhost:6379 | Cache & sessions |
| PgAdmin | http://localhost:5050 | DB admin UI (optional) |
| Prisma Studio | http://localhost:5555 | Prisma GUI |

## Common Commands

```bash
# Start everything
make up

# Check status
make test

# View logs
make logs

# Create migration
npx prisma migrate dev --name description

# Reset database
make reset

# Create backup
make backup

# List backups
make backup-list

# Restore backup
make restore BACKUP=agora_backup_YYYYMMDD_HHMMSS

# Stop services
make down

# Clean everything
make clean
```

## Next Steps

- Read [Connection Pooling Guide](docs/connection-pooling.md)
- Read [Read Replicas Guide](docs/read-replicas.md)
- Explore the [Prisma Schema](prisma/schema.prisma)
- Check out [Seed Data](src/seed.ts)
