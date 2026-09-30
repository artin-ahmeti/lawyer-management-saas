/** Accept only local app paths, including after a PKCE callback. */
export function safeNext(value: string | null | undefined, fallback = '/today'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
    return fallback;
  const path = value.split('?')[0]?.split('#')[0] ?? '';
  if (['/sign-in', '/sign-up', '/verify', '/forgot-password', '/auth/callback'].includes(path))
    return fallback;
  return value;
}
