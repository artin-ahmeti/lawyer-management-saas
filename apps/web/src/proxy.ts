import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabase, previewMode, supabaseAnonKey, supabaseUrl } from '@/lib/env';

const AUTH_PATHS = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/verify',
  '/update-password',
  '/auth/callback',
];

/**
 * Session gate. Refreshes the Supabase session cookie on every request and
 * keeps signed-out visitors on the auth pages. Only explicit preview mode
 * bypasses the session gate; missing configuration never grants access.
 */
export async function proxy(request: NextRequest) {
  if (previewMode) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const onAuthPage = AUTH_PATHS.includes(pathname);
  if (pathname === '/auth/callback') return NextResponse.next();
  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = '/sign-in';
  signInUrl.search = '';
  signInUrl.searchParams.set('next', pathname + request.nextUrl.search);
  if (!hasSupabase) return onAuthPage ? NextResponse.next() : NextResponse.redirect(signInUrl);

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirect = (url: URL) => {
    const result = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    return result;
  };

  if (!user && !onAuthPage) {
    return redirect(signInUrl);
  }
  if (user) {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error)
      return NextResponse.json(
        { error: 'Unable to verify the session. Please try again.' },
        { status: 503 },
      );
    const requiresVerification =
      assurance.data?.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2';
    if (requiresVerification && pathname !== '/verify') {
      const url = request.nextUrl.clone();
      url.pathname = '/verify';
      url.search = '';
      url.searchParams.set('next', onAuthPage ? '/today' : pathname + request.nextUrl.search);
      return redirect(url);
    }
    if (!requiresVerification && onAuthPage && pathname !== '/update-password') {
      const url = request.nextUrl.clone();
      url.pathname = '/today';
      url.search = '';
      return redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
