import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';

/** Test-owned database, never a reset or dispatcher over the developer's business records. */
export function executionDatabase() {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Local Postgres required');
  const admin = postgres(url.href, { max: 1 });
  const name = `clepso_jobs_${randomUUID().replaceAll('-', '')}`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 6, connection: { statement_timeout: 5000 } });
  return {
    sql,
    async start() {
      await admin`create database ${admin(name)} template template0`;
      await sql
        .unsafe(
          `create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz, raw_user_meta_data jsonb);
        create table auth.sessions (id uuid primary key, user_id uuid, not_after timestamptz);
        create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;`,
        )
        .simple();
      const root = new URL('../../../supabase/migrations/', import.meta.url);
      for (const file of (await readdir(root)).filter((file) => file.endsWith('.sql')).sort()) {
        await sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
      }
    },
    async close() {
      await sql.end({ timeout: 5 });
      await admin`drop database if exists ${admin(name)}`;
      await admin.end({ timeout: 5 });
    },
  };
}
