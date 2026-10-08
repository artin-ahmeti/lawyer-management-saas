/**
 * Launch readiness. A production build refuses to start while any blocker is
 * open, so the public page can never ship with a dead signup link or a missing
 * login destination. Pure and dependency-free: next.config.ts imports it.
 */
/** The environment variables read here (process.env is passed in). */
export type LaunchEnv = Record<string, string | undefined>;

const set = (v: string | undefined) => Boolean(v && v.trim());

export function launchBlockers(env: LaunchEnv): string[] {
  const blockers: string[] = [];
  const earlyAccess = env.NEXT_PUBLIC_LAUNCH_MODE === 'early-access';
  if (!set(env.NEXT_PUBLIC_SITE_URL))
    blockers.push('NEXT_PUBLIC_SITE_URL is not set (canonical URL and social previews).');
  if (!set(env.NEXT_PUBLIC_LOGIN_URL))
    blockers.push('NEXT_PUBLIC_LOGIN_URL is not set (Log in has no destination).');
  if (earlyAccess && !set(env.EARLY_ACCESS_ENDPOINT))
    blockers.push(
      'EARLY_ACCESS_ENDPOINT is not set (the early-access form cannot deliver enquiries).',
    );
  if (!earlyAccess && !set(env.NEXT_PUBLIC_SIGN_UP_URL))
    blockers.push(
      'NEXT_PUBLIC_SIGN_UP_URL is not set (Get started has no destination). Set it or use NEXT_PUBLIC_LAUNCH_MODE=early-access.',
    );
  if (!set(env.NEXT_PUBLIC_PRIVACY_URL))
    blockers.push(
      'NEXT_PUBLIC_PRIVACY_URL is not set (the enquiry form and footer need a privacy notice).',
    );
  if (!set(env.NEXT_PUBLIC_TERMS_URL)) blockers.push('NEXT_PUBLIC_TERMS_URL is not set.');
  return blockers;
}
