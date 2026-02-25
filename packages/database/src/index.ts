import { PrismaClient } from '@prisma/client';

// Export all Prisma types
export * from '@prisma/client';

// Create a singleton PrismaClient instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection pooling configuration helper
export interface DatabaseConfig {
  url?: string;
  directUrl?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

// PgBouncer compatibility settings
export const pgbouncerConfig = {
  // Required for PgBouncer transaction pooling mode
  // See: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Read replica configuration
export interface ReadReplicaConfig {
  url: string;
  location?: string;
}

export interface MultiDatabaseConfig {
  primary: DatabaseConfig;
  replicas: ReadReplicaConfig[];
}

// Create a client with read replica support
export function createPrismaClientWithReplicas(config: MultiDatabaseConfig): {
  primary: PrismaClient;
  replica: PrismaClient;
} {
  const primary = new PrismaClient({
    datasources: {
      db: {
        url: config.primary.url,
      },
    },
  });

  // Use first replica as read replica, fallback to primary
  const replicaUrl = config.replicas[0]?.url || config.primary.url;
  const replica = new PrismaClient({
    datasources: {
      db: {
        url: replicaUrl,
      },
    },
  });

  return { primary, replica };
}

// Health check helper
export async function checkDatabaseHealth(client: PrismaClient = prisma): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await client.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown helper
export async function disconnectPrisma(client: PrismaClient = prisma): Promise<void> {
  await client.$disconnect();
}

// Query helper for complex aggregations
export async function runTransaction<T>(
  operations: (tx: PrismaClient['$transaction']) => Promise<T>,
  options?: { maxWait?: number; timeout?: number }
): Promise<T> {
  return prisma.$transaction(operations, options);
}

export default prisma;
