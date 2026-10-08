/**
 * Drizzle schema. Conventions (Plan §5 / CLAUDE.md): every tenant table gets
 * firm_id, timestamps, created_by, deleted_at. RLS enabled AND forced via the
 * hand-written SQL migrations that live alongside the generated ones in
 * supabase/migrations/. Money numeric(19,4); durations integer minutes.
 */
export * from './tenancy.js';
export * from './execution.js';
export * from './staff-invitations.js';
export * from './staff-session-contexts.js';
export * from './matters.js';
export * from './contacts.js';
