'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { primaryCtaLabel, site } from '@/config/site';
import { track, type CtaLocation } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { buttonClass, type ButtonSize, type ButtonVariant } from '../ui/button-styles';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { EarlyAccessForm } from './EarlyAccessForm';

type Handoff = 'signup' | 'login';
interface CtaContextValue {
  openEarlyAccess: () => void;
  openHandoff: (kind: Handoff) => void;
}

const CtaContext = createContext<CtaContextValue | null>(null);

/** Owns the two conversion dialogs so every CTA on the page behaves the same way. */
export function CtaProvider({ children }: { children: ReactNode }) {
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const value = useMemo<CtaContextValue>(
    () => ({ openEarlyAccess: () => setEarlyAccess(true), openHandoff: (k) => setHandoff(k) }),
    [],
  );
  return (
    <CtaContext.Provider value={value}>
      {children}
      <Dialog
        open={earlyAccess}
        onClose={() => setEarlyAccess(false)}
        title="Request early access"
        eyebrow={<StatusBadge status="preview" detail="Clepso is in preview" />}
      >
        <p className="mb-6 text-body text-ink-2">
          Tell us about your firm and we will be in touch about early access.
        </p>
        <EarlyAccessForm onDone={() => setEarlyAccess(false)} />
      </Dialog>
      <Dialog
        open={handoff !== null}
        onClose={() => setHandoff(null)}
        title={
          handoff === 'login'
            ? 'Log in is not connected in this preview'
            : 'Sign-up is not connected in this preview'
        }
        eyebrow={<span className="text-overline text-warning-ink">Preview handoff</span>}
      >
        <p className="text-body text-ink-2">
          This preview build has no {handoff === 'login' ? 'log-in' : 'sign-up'} destination
          configured, so this button goes nowhere yet. Nothing was created and no account exists.
        </p>
        <p className="mt-3 text-body-sm text-ink-3">
          You can explore the interactive product and AI demos while access is being prepared.
        </p>
        <button
          type="button"
          onClick={() => setHandoff(null)}
          className={buttonClass('secondary', 'md', 'mt-6')}
        >
          Close
        </button>
      </Dialog>
    </CtaContext.Provider>
  );
}

function useCta(): CtaContextValue {
  const ctx = useContext(CtaContext);
  if (!ctx) throw new Error('CTA components need <CtaProvider>');
  return ctx;
}

/** The primary action. Its label and destination come from the launch mode. */
export function CtaButton({
  location,
  variant = 'primary',
  size = 'md',
  className,
  arrow = false,
}: {
  location: CtaLocation;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  arrow?: boolean;
}) {
  const { openEarlyAccess, openHandoff } = useCta();
  const cls = buttonClass(variant, size, className);
  const content = (
    <>
      {primaryCtaLabel}
      {arrow ? <Icon name="arrow-right" size={18} /> : null}
    </>
  );
  if (site.launchMode === 'early-access') {
    return (
      <button
        type="button"
        className={cls}
        onClick={() => {
          track({
            name: 'cta_click',
            location,
            mode: site.launchMode,
            destination: 'early-access-form',
          });
          openEarlyAccess();
        }}
      >
        {content}
      </button>
    );
  }
  if (site.signUpUrl) {
    return (
      <a
        href={site.signUpUrl}
        className={cls}
        onClick={() =>
          track({ name: 'cta_click', location, mode: site.launchMode, destination: 'signup' })
        }
      >
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => {
        track({
          name: 'cta_click',
          location,
          mode: site.launchMode,
          destination: 'preview-handoff',
        });
        openHandoff('signup');
      }}
    >
      {content}
    </button>
  );
}

/** Log in for existing users: always a quiet link, never behind the sales story. */
export function LoginLink({
  location,
  className,
  children = 'Log in',
}: {
  location: CtaLocation;
  className?: string;
  children?: ReactNode;
}) {
  const { openHandoff } = useCta();
  const cls = cn(
    'inline-flex min-h-11 items-center rounded-md px-2 text-[15px] font-medium text-ink-2 transition-colors duration-[180ms] hover:text-ink',
    className,
  );
  const onPreview = useCallback(() => {
    track({ name: 'login_click', location, destination: 'preview-handoff' });
    openHandoff('login');
  }, [location, openHandoff]);
  if (site.loginUrl) {
    return (
      <a
        href={site.loginUrl}
        className={cls}
        onClick={() => track({ name: 'login_click', location, destination: 'app' })}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onPreview}>
      {children}
    </button>
  );
}
