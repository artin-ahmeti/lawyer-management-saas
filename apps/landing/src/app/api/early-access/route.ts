import { NextResponse } from 'next/server';
import type { EarlyAccessResult } from '@/lib/early-access';
import { earlyAccessSchema } from './schema';

/**
 * Early-access enquiries. Validates, then forwards server-side to the configured
 * EARLY_ACCESS_ENDPOINT (a future NestJS API route or a form service). Success is
 * reported only when that endpoint accepts the enquiry. Nothing is stored here,
 * nothing is logged, and nothing is written to Supabase from this app.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: 'error' }, 400);
  }
  const parsed = earlyAccessSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return json({ status: 'invalid', fieldErrors }, 422);
  }
  // Honeypot filled: accept silently without forwarding.
  if (parsed.data.website) return json({ status: 'received' }, 200);

  const endpoint = process.env.EARLY_ACCESS_ENDPOINT?.trim();
  if (!endpoint) return json({ status: 'not-configured' }, 503);

  const { name, email, firm, firmSize, message } = parsed.data;
  const enquiry = { name, email, firm, firmSize, message };
  try {
    const token = process.env.EARLY_ACCESS_TOKEN?.trim();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...enquiry, source: 'clepso-landing' }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? json({ status: 'received' }, 200) : json({ status: 'error' }, 502);
  } catch {
    return json({ status: 'error' }, 502);
  }
}

function json(result: EarlyAccessResult, status: number) {
  return NextResponse.json(result, { status, headers: { 'cache-control': 'no-store' } });
}
