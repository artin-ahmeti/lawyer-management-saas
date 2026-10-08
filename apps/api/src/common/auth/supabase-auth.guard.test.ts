import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const secret = new TextEncoder().encode('test-only-jwt-secret-at-least-32-characters');
const guard = new SupabaseAuthGuard(
  new ConfigService({
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_JWT_SECRET: new TextDecoder().decode(secret),
  }),
);

async function authorize(sub: string, expiry = true) {
  let jwt = new SignJWT({ role: 'authenticated' })
    .setSubject(sub)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' });
  if (expiry) jwt = jwt.setExpirationTime('1h');
  const request = { headers: { authorization: `Bearer ${await jwt.sign(secret)}` } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
  return guard.canActivate(context);
}

describe('verified staff identity', () => {
  it('preserves valid signed Supabase authentication', async () => {
    await expect(authorize('00000000-0000-4000-a000-000000000001')).resolves.toBe(true);
  });
  it('rejects a signed token with an invalid actor identifier', async () => {
    await expect(authorize('not-a-user-uuid')).rejects.toThrow();
  });
  it('requires an expiry on accepted tokens', async () => {
    await expect(authorize('00000000-0000-4000-a000-000000000001', false)).rejects.toThrow();
  });
});
