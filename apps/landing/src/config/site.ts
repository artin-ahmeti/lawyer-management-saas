/**
 * Site configuration: every outbound destination and the launch mode live here,
 * read once from NEXT_PUBLIC_* variables (inlined at build time). Components never
 * hard-code a URL or a CTA label.
 */
export type LaunchMode = 'signup' | 'early-access';
export type SiteStage = 'preview' | 'production';

const clean = (v: string | undefined): string | null => (v && v.trim() ? v.trim() : null);

const stage: SiteStage =
  process.env.NEXT_PUBLIC_SITE_STAGE === 'production' ? 'production' : 'preview';
const launchMode: LaunchMode =
  process.env.NEXT_PUBLIC_LAUNCH_MODE === 'early-access' ? 'early-access' : 'signup';

export const site = {
  name: 'Clepso',
  title: 'Clepso | Law Practice Management',
  description:
    'Clepso is law practice management for solo lawyers and small firms: matters, deadlines, documents, client updates and billing in one workspace, with AI that prepares work for your review.',
  stage,
  /** Indexing needs an explicit opt-in on a production-stage build. */
  indexable: stage === 'production' && process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true',
  url: clean(process.env.NEXT_PUBLIC_SITE_URL),
  launchMode,
  signUpUrl: clean(process.env.NEXT_PUBLIC_SIGN_UP_URL),
  loginUrl: clean(process.env.NEXT_PUBLIC_LOGIN_URL),
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  privacyUrl: clean(process.env.NEXT_PUBLIC_PRIVACY_URL),
  termsUrl: clean(process.env.NEXT_PUBLIC_TERMS_URL),
} as const;

/** The one acquisition label, consistent everywhere on the page. */
export const primaryCtaLabel = launchMode === 'signup' ? 'Get started' : 'Request early access';

export const nav = [
  { href: '#product', label: 'Product' },
  { href: '#ai', label: 'AI workflows' },
  { href: '#faq', label: 'FAQ' },
] as const;
