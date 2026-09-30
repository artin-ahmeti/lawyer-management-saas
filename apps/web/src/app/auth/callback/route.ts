import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth-redirect';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  const client = await getSupabaseServer();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }
  return NextResponse.redirect(new URL('/sign-in?error=callback', request.nextUrl.origin));
}
