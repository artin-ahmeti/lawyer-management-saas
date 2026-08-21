import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  // Single migration history shared with the Supabase CLI (Plan §2).
  out: '../../supabase/migrations',
  migrations: {
    prefix: 'timestamp',
  },
  dbCredentials: {
    // Local Supabase stack; override via env for staging/prod.
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
});
