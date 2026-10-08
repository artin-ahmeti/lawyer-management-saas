/**
 * Privacy-conscious analytics hooks. Events carry locations, choices and
 * outcomes only: never sample-document text, client details or form values.
 * A CTA click is not a signup; completed signups are measured app-side.
 *
 * Delivery: a `clepso:analytics` DOM event plus `window.dataLayer` when a tag
 * manager has installed one. Nothing is sent anywhere by default.
 */
import type { LaunchMode } from '@/config/site';

export type CtaLocation =
  'header' | 'mobile-menu' | 'hero' | 'product' | 'ai-demo' | 'closing' | 'footer';

export type AnalyticsEvent =
  | {
      name: 'cta_click';
      location: CtaLocation;
      mode: LaunchMode;
      destination: 'signup' | 'early-access-form' | 'preview-handoff';
    }
  | { name: 'login_click'; location: CtaLocation; destination: 'app' | 'preview-handoff' }
  | { name: 'product_view_select'; view: string }
  | { name: 'ai_workflow_select'; workflow: string }
  | { name: 'ai_review_complete'; workflow: string; outcome: string }
  | { name: 'source_open'; workflow: string; source: string }
  | { name: 'hero_replay' }
  | { name: 'motion_toggle'; paused: boolean }
  | { name: 'faq_open'; question: string }
  | { name: 'early_access_submit'; result: 'received' | 'not-configured' | 'invalid' | 'error' };

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function track(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  const { name, ...props } = event;
  window.dispatchEvent(new CustomEvent('clepso:analytics', { detail: { name, props } }));
  const w = window as DataLayerWindow;
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...props });
  if (process.env.NODE_ENV === 'development') console.debug('[analytics]', name, props);
}
