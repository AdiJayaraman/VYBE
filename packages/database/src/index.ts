import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export * from './generated/prisma/client';
export { hashPassword, verifyPassword } from './password';

const FALLBACK_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/vybe?schema=public';

export interface CreatePrismaClientOptions {
  connectionString?: string;
  logQueries?: boolean;
  /** Maximum pool connections. Defaults to the `pg` pool default (10). */
  poolMax?: number;
}

function resolvePoolMax(options: CreatePrismaClientOptions): number | undefined {
  if (typeof options.poolMax === 'number' && options.poolMax > 0) return options.poolMax;
  const fromEnv = Number(process.env.VYBE_PG_POOL_MAX ?? '');
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : undefined;
}

/**
 * Prisma 7 is Rust-free and always talks to PostgreSQL through a driver adapter.
 */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const connectionString =
    options.connectionString ?? process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL;

  const poolMax = resolvePoolMax(options);
  const adapter = new PrismaPg({
    connectionString,
    ...(poolMax === undefined ? {} : { max: poolMax }),
  });
  return new PrismaClient({
    adapter,
    log: options.logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

/**
 * Single shared client. Cached on `globalThis` so Next.js dev HMR and NestJS
 * watch mode never exhaust the PostgreSQL connection pool.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  vybePrisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.vybePrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.vybePrisma = prisma;
}
