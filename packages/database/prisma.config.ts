import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const fallbackUrl = 'postgresql://postgres:postgres@localhost:5432/vybe?schema=public';

/**
 * Prisma 7 configuration. `prisma generate` never connects to the database, but
 * the config must resolve a URL string, so we fall back to a local development
 * default when `DATABASE_URL` is not exported in the shell.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackUrl,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackUrl,
  },
});
