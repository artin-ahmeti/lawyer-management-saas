'use client';

import {
  Banner,
  Button,
  Checkbox,
  Chip,
  Field,
  Icon,
  IconWell,
  Input,
  Pill,
  Wordmark,
} from '@lawfirm/ui-web';
import type { AuthMFAListFactorsResponse } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { NativeSelect } from '@/components/NativeSelect';
import { safeNext } from '@/lib/auth-redirect';
import { previewMode } from '@/lib/env';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme';
import { AuthPreview } from './AuthPreview';

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify' | 'update-password';
type Screen =
  | 'signin'
  | 'forgot'
  | 'forgot-sent'
  | 'twofa'
  | 'su-account'
  | 'su-verify'
  | 'su-firm'
  | 'su-team'
  | 'done'
  | 'update';

const INITIAL: Record<AuthMode, Screen> = {
  'sign-in': 'signin',
  'sign-up': 'su-account',
  'forgot-password': 'forgot',
  verify: 'twofa',
  'update-password': 'update',
};
const DEMO_FIRM = 'Tran & Okafor LLP';
const DEMO_EMAIL = 'dana@tranokafor.law';
const PRACTICES = [
  'Probate',
  'Personal injury',
  'Corporate',
  'Criminal defense',
  'Family',
  'Immigration',
];
const ROLES = ['Attorney', 'Paralegal', 'Staff'];
const INVITE_PLACEHOLDERS = [
  'lisa@tranokafor.law',
  'j.whitfield@tranokafor.law',
  'colleague@tranokafor.law',
];
const STRENGTH_COLORS = [
  'var(--border)',
  'var(--danger-dot)',
  'var(--warning-dot)',
  'var(--accent)',
  'var(--success-dot)',
];
const STRENGTH_LABELS = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong'];
const EMPTY_CODE = ['', '', '', '', '', ''];

const strengthOf = (p: string) =>
  [p.length >= 8, /\d/.test(p), /[a-z]/.test(p) && /[A-Z]/.test(p), /[^\w\s]/.test(p)].filter(
    Boolean,
  ).length;

const h1Style: CSSProperties = { fontSize: 32, lineHeight: '38px', margin: 0 };
const screenStyle = (gap = 28): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
  animation: 'cl-enter 260ms var(--ease-standard) both',
});
const backStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  font: 'var(--text-label)',
  fontWeight: 600,
  color: 'var(--ink-2)',
  alignSelf: 'flex-start',
  background: 'none',
  border: 0,
  padding: 0,
  cursor: 'pointer',
};
const pwToggleStyle: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  color: 'var(--ink-3)',
  font: 'var(--text-caption)',
  fontWeight: 600,
  padding: '2px 4px',
};

function Heading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {eyebrow ? <div className="cl-eyebrow">{eyebrow}</div> : null}
      <h1 className="cl-t-title-1" style={h1Style}>
        {title}
      </h1>
      {lede ? (
        <p className="cl-t-body cl-muted" style={{ margin: 0 }}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 2,
            background: n <= step ? 'var(--accent)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

/**
 * Sign in, two-step verification, password reset and the three-step sign-up.
 * With Supabase configured the buttons call Auth; without it (preview) the
 * flow is simulated end to end so the design can be reviewed.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { scheme, toggle } = useTheme();
  const client = getSupabaseBrowser();
  const simulated = !client;
  const next = safeNext(params.get('next'));

  const [screen, setScreen] = useState<Screen>(INITIAL[mode]);
  const [flow, setFlow] = useState<'signin' | 'signup'>(mode === 'sign-up' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [firmSize, setFirmSize] = useState('2–10 people');
  const [stateBar, setStateBar] = useState('California');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [banner, setBanner] = useState<ReactNode>(null);
  const [error, setError] = useState(
    params.get('error') ? 'The link could not be verified. Please request a new one.' : '',
  );
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [practices, setPractices] = useState<Record<string, boolean>>({
    Probate: true,
    Corporate: true,
  });
  const [invites, setInvites] = useState(ROLES.map((role) => ({ email: '', role })));
  const [factorId, setFactorId] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (mode !== 'verify' || !client) return;
    let active = true;
    void client.auth.mfa.listFactors().then(({ data, error }: AuthMFAListFactorsResponse) => {
      if (!active) return;
      if (error) setError(error.message);
      else setFactorId(data.totp.find((f) => f.status === 'verified')?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [client, mode]);

  const go = useCallback((to: Screen) => {
    setScreen(to);
    setEmailErr('');
    setPwErr('');
    setCodeErr('');
    setBanner(null);
    setError('');
    setLoading(false);
    setCode(EMPTY_CODE);
  }, []);
  const later = (ms: number, fn: () => void) => {
    setLoading(true);
    timer.current = setTimeout(fn, ms);
  };
  const clearErrors = () => {
    setEmailErr('');
    setPwErr('');
    setBanner(null);
    setError('');
  };
  const fail = (cause: unknown) =>
    setError(cause instanceof Error ? cause.message : 'Unable to continue. Please try again.');
  const emailDisplay = email.trim() || DEMO_EMAIL;
  const firmDisplay = firm.trim() || DEMO_FIRM;
  const strong = strengthOf(password);

  const completeSignIn = async () => {
    if (!client) return;
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    router.replace(
      data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
        ? `/verify?next=${encodeURIComponent(next)}`
        : next,
    );
    router.refresh();
  };

  const submitSignin = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!email.trim()) return setEmailErr('Enter your work email');
    if (password.length < 8) return setPwErr('At least 8 characters');
    if (!client) return later(700, () => go('twofa'));
    setLoading(true);
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          setBanner(
            <>
              That password doesn&apos;t match <b>{email.trim()}</b>. Try again or{' '}
              <Link
                href="/forgot-password"
                style={{
                  color: 'inherit',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                reset it
              </Link>
              .
            </>,
          );
        } else setBanner(error.message);
        return;
      }
      await completeSignIn();
    } catch (cause) {
      fail(cause);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    clearErrors();
    if (!client) return go('twofa');
    setLoading(true);
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const submitCode = useCallback(
    async (digits: string[]) => {
      const value = digits.join('');
      if (value.length < 6) return setCodeErr('Enter all six digits');
      if (!client) {
        if (value === '000000') {
          setCodeErr("That code didn't match. Check the newest text or request another.");
          setCode(EMPTY_CODE);
          codeRefs.current[0]?.focus();
          return;
        }
        return later(600, () => go('done'));
      }
      setLoading(true);
      try {
        if (!factorId)
          throw new Error(
            'No authenticator is enrolled on this account. Open your email verification link or return to sign in.',
          );
        const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: value });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } catch (cause) {
        setCodeErr(cause instanceof Error ? cause.message : 'That code did not match.');
        setCode(EMPTY_CODE);
        codeRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [client, factorId, go, next, router],
  );
  const onCode = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const nextCode = [...code];
    if (digits.length > 1) {
      // A pasted code fills the cells from this one on.
      digits
        .slice(0, 6 - i)
        .split('')
        .forEach((d, j) => {
          nextCode[i + j] = d;
        });
    } else nextCode[i] = digits;
    setCode(nextCode);
    setCodeErr('');
    const last = Math.min(5, i + Math.max(1, digits.length));
    if (digits && last < 6) codeRefs.current[Math.min(5, last)]?.focus();
    if (nextCode.every(Boolean)) void submitCode(nextCode);
  };
  const onCodeKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
  };

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!email.trim()) return setEmailErr('Enter your work email');
    if (strong < 2) return setPwErr('Make it stronger');
    if (!client) return later(500, () => go('su-verify'));
    setLoading(true);
    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/sign-up`,
        },
      });
      if (error) throw error;
      go(data.session ? 'su-firm' : 'su-verify');
    } catch (cause) {
      if (cause instanceof Error && /already registered/i.test(cause.message))
        setEmailErr('Already used by another firm. Sign in instead?');
      else fail(cause);
    } finally {
      setLoading(false);
    }
  };
  const resendVerification = async () => {
    if (!client) return;
    const { error } = await client.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setError(error.message);
  };
  const continueVerified = async () => {
    if (!client) return go('su-firm');
    const { data } = await client.auth.getSession();
    if (data.session) go('su-firm');
    else setError('Not verified yet. Open the link in your email, then continue.');
  };

  const submitForgot = async (e?: FormEvent) => {
    e?.preventDefault();
    clearErrors();
    if (!email.trim()) return setEmailErr('Enter your work email');
    if (!client) return go('forgot-sent');
    setLoading(true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (error) throw error;
      go('forgot-sent');
    } catch (cause) {
      fail(cause);
    } finally {
      setLoading(false);
    }
  };

  const submitUpdate = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (strong < 2) return setPwErr('Make it stronger');
    if (!client) {
      router.replace('/sign-in');
      return;
    }
    setLoading(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/today');
      router.refresh();
    } catch (cause) {
      fail(cause);
    } finally {
      setLoading(false);
    }
  };

  const goSignin = () => {
    setFlow('signin');
    if (mode === 'sign-in') go('signin');
    else router.push('/sign-in');
  };
  const inviteCount = invites.filter((i) => i.email.trim()).length;
  const themeButton = (
    <Button
      variant="ghost"
      iconOnly
      round
      icon={scheme === 'dark' ? 'sun' : 'moon'}
      aria-label={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
    />
  );
  const passwordField = (
    id: string,
    autoComplete: string,
    placeholder: string,
    extra?: ReactNode,
    forgot?: boolean,
  ) => (
    <div className={`cl-field ${pwErr ? 'is-error' : ''}`}>
      <label className="cl-field__label" htmlFor={id}>
        <span>Password</span>
        {forgot ? (
          <Link
            href="/forgot-password"
            className="opt"
            style={{ color: 'var(--accent)', fontWeight: 500 }}
            onClick={(e) => {
              if (mode === 'sign-in') {
                e.preventDefault();
                go('forgot');
              }
            }}
          >
            Forgot?
          </Link>
        ) : null}
      </label>
      <Input
        id={id}
        type={showPw ? 'text' : 'password'}
        placeholder={placeholder}
        value={password}
        autoComplete={autoComplete}
        onChange={(e) => {
          setPassword(e.target.value);
          setPwErr('');
          setBanner(null);
        }}
        suffix={
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={pwToggleStyle}
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        }
      />
      {extra}
      {pwErr && !extra ? <div className="cl-field__help">{pwErr}</div> : null}
    </div>
  );
  const emailField = (id: string, placeholder = 'you@yourfirm.law') => (
    <Field label="Work email" error={emailErr || undefined}>
      <Input
        id={id}
        type="email"
        placeholder={placeholder}
        value={email}
        autoComplete="email"
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailErr('');
          setBanner(null);
        }}
      />
    </Field>
  );
  const strengthMeter = (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: 4,
          marginTop: 4,
        }}
        aria-hidden="true"
      >
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            style={{
              height: 3,
              borderRadius: 2,
              background: n <= strong ? STRENGTH_COLORS[strong] : 'var(--border)',
              transition: 'background 200ms var(--ease-standard)',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span
          className="cl-t-caption"
          style={{ color: strong ? STRENGTH_COLORS[strong] : 'var(--ink-3)' }}
        >
          {STRENGTH_LABELS[strong]}
        </span>
        {pwErr ? <span className="cl-t-caption cl-tone-danger">{pwErr}</span> : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
          gap: '6px 12px',
          marginTop: 6,
        }}
      >
        {[
          [password.length >= 8, '8+ characters'],
          [/\d/.test(password), 'A number'],
          [/[a-z]/.test(password) && /[A-Z]/.test(password), 'Upper & lower case'],
          [/[^\w\s]/.test(password), 'A symbol'],
        ].map(([ok, label]) => (
          <span
            key={String(label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              font: 'var(--text-caption)',
              color: ok ? 'var(--success-ink)' : 'var(--ink-3)',
              transition: 'color 200ms',
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: ok ? 'var(--success-dot)' : 'var(--surface-2)',
                color: ok ? 'var(--on-accent)' : 'transparent',
                transition: 'background 200ms',
              }}
            >
              <Icon name="check" style={{ width: 9, height: 9, strokeWidth: 3 }} />
            </span>
            {label}
          </span>
        ))}
      </div>
    </>
  );

  let body: ReactNode = null;
  if (screen === 'signin') {
    body = (
      <div style={screenStyle()}>
        <Heading
          eyebrow={DEMO_FIRM}
          title="Welcome back."
          lede="You were last here yesterday at 6:12 PM."
        />
        {banner ? (
          <div
            role="alert"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger-ink)',
              font: 'var(--text-body-sm)',
              animation: 'cl-shake 320ms var(--ease-standard)',
            }}
          >
            <Icon name="alert" size="sm" style={{ marginTop: 2, flex: 'none' }} />
            <span>{banner}</span>
          </div>
        ) : null}
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <button
          type="button"
          className="cl-btn cl-btn--outline cl-btn--lg cl-btn--block"
          onClick={() => void google()}
          disabled={loading}
        >
          <GoogleMark />
          Continue with Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="cl-divider" style={{ flex: 1 }} />
          <span className="cl-t-caption cl-faint">or with email</span>
          <span className="cl-divider" style={{ flex: 1 }} />
        </div>
        <form className="cl-form" onSubmit={(e) => void submitSignin(e)} noValidate>
          {emailField('si-email')}
          {passwordField('si-pw', 'current-password', '••••••••••', undefined, true)}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              font: 'var(--text-body-sm)',
              color: 'var(--ink-2)',
            }}
          >
            <Checkbox
              shape="square"
              checked={remember}
              onChange={setRemember}
              label="Stay signed in on this device"
            />
            <span style={{ cursor: 'pointer' }} onClick={() => setRemember(!remember)}>
              Stay signed in on this device
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            block
            type="submit"
            loading={loading}
            style={{ marginTop: 4 }}
          >
            Sign in
          </Button>
        </form>
        <p className="cl-t-body-sm cl-muted" style={{ textAlign: 'center', margin: 0 }}>
          New firm on Clepso?{' '}
          <Link href="/sign-up" style={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
        {previewMode ? (
          <Link href="/today" className="cl-btn cl-btn--ghost">
            Open demo workspace
          </Link>
        ) : null}
      </div>
    );
  } else if (screen === 'forgot') {
    body = (
      <div style={screenStyle()}>
        <button type="button" style={backStyle} onClick={goSignin}>
          <Icon name="chevron-left" size="sm" />
          Back to sign in
        </button>
        <Heading
          title="Reset your password."
          lede="We'll email a link that works for 15 minutes. Nothing changes until you use it."
        />
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <form className="cl-form" onSubmit={(e) => void submitForgot(e)} noValidate>
          {emailField('fp-email')}
          <Button variant="primary" size="lg" block type="submit" loading={loading}>
            Email reset link
          </Button>
        </form>
      </div>
    );
  } else if (screen === 'forgot-sent') {
    body = (
      <div style={screenStyle(24)}>
        <span style={{ animation: 'cl-pop 420ms var(--ease-standard) both', display: 'flex' }}>
          <IconWell name="send" tone="accent" size="lg" />
        </span>
        <Heading
          title="Check your inbox."
          lede={
            <>
              A reset link is on its way to <b style={{ color: 'var(--ink)' }}>{emailDisplay}</b>.
              It expires in 15 minutes.
            </>
          }
        />
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="lg" onClick={goSignin}>
            Back to sign in
          </Button>
          <Button variant="ghost" size="lg" onClick={() => void submitForgot()}>
            Didn&apos;t get it? Resend
          </Button>
        </div>
      </div>
    );
  } else if (screen === 'twofa') {
    body = (
      <div style={screenStyle()}>
        <button type="button" style={backStyle} onClick={goSignin}>
          <Icon name="chevron-left" size="sm" />
          Back
        </button>
        <Heading
          eyebrow="Two-step verification"
          title={
            simulated
              ? 'Enter the code from your phone.'
              : 'Enter the code from your authenticator.'
          }
          lede={
            simulated ? (
              <>
                We texted a 6-digit code to <span className="cl-mono cl-mono--ink">····4210</span>.
                It&apos;s good for 10 minutes.
              </>
            ) : (
              'Open your authenticator app and enter the 6-digit code for Clepso.'
            )
          }
        />
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 8 }}>
            {code.map((value, i) => (
              <input
                key={i}
                ref={(el) => {
                  codeRefs.current[i] = el;
                }}
                value={value}
                onChange={onCode(i)}
                onKeyDown={onCodeKey(i)}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={i === 0 ? 6 : 1}
                aria-label={`Digit ${i + 1}`}
                autoFocus={i === 0}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  height: 56,
                  width: '100%',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  font: '500 24px/1 var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'border-color 120ms, box-shadow 120ms',
                }}
              />
            ))}
          </div>
          {codeErr ? (
            <div
              className="cl-t-caption cl-tone-danger"
              role="alert"
              style={{ animation: 'cl-shake 320ms var(--ease-standard)' }}
            >
              {codeErr}
            </div>
          ) : null}
        </div>
        <Button
          variant="primary"
          size="lg"
          block
          loading={loading}
          onClick={() => void submitCode(code)}
        >
          Verify and continue
        </Button>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            font: 'var(--text-body-sm)',
            color: 'var(--ink-2)',
          }}
        >
          <a href="#" style={{ fontWeight: 600 }} onClick={(e) => e.preventDefault()}>
            Resend code
          </a>
          <a href="#" style={{ fontWeight: 600 }} onClick={(e) => e.preventDefault()}>
            Use a backup code
          </a>
        </div>
        {simulated ? (
          <p className="cl-t-caption cl-faint" style={{ margin: 0 }}>
            Tip: type 000000 to see the error state.
          </p>
        ) : null}
      </div>
    );
  } else if (screen === 'su-account') {
    body = (
      <div style={screenStyle()}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar step={1} />
          <Heading eyebrow="Step 1 of 3 · Your account" title="Let's get you set up." />
        </div>
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <form className="cl-form" onSubmit={(e) => void submitAccount(e)} noValidate>
          <Field label="Full name">
            <Input
              id="su-name"
              placeholder="Dana Okafor"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {emailField('su-email', 'dana@tranokafor.law')}
          {passwordField('su-pw', 'new-password', 'At least 8 characters', strengthMeter)}
          <Button
            variant="primary"
            size="lg"
            block
            type="submit"
            loading={loading}
            style={{ marginTop: 4 }}
          >
            Create account
          </Button>
        </form>
        <p className="cl-t-caption cl-faint" style={{ textAlign: 'center', margin: 0 }}>
          By continuing you agree to the Terms of Service and Privacy Policy.
        </p>
        <p className="cl-t-body-sm cl-muted" style={{ textAlign: 'center', margin: 0 }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    );
  } else if (screen === 'su-verify') {
    body = (
      <div style={screenStyle(24)}>
        <span style={{ animation: 'cl-pop 420ms var(--ease-standard) both', display: 'flex' }}>
          <IconWell name="inbox" tone="accent" size="lg" />
        </span>
        <Heading
          title="Confirm it's you."
          lede={
            <>
              We sent a verification link to <b style={{ color: 'var(--ink)' }}>{emailDisplay}</b>.
              Open it on any device; this page will move on by itself.
            </>
          }
        />
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            font: 'var(--text-body-sm)',
            color: 'var(--ink-2)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'cl-pulse 1.4s ease-in-out infinite',
            }}
          />
          Waiting for you to open the link…
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" size="lg" onClick={() => void continueVerified()}>
            I&apos;ve verified, continue
          </Button>
          <Button variant="ghost" size="lg" onClick={() => void resendVerification()}>
            Resend email
          </Button>
        </div>
        <p className="cl-t-caption cl-faint" style={{ margin: 0 }}>
          Wrong address?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go('su-account');
            }}
          >
            Go back and change it
          </a>
          .
        </p>
      </div>
    );
  } else if (screen === 'su-firm') {
    body = (
      <div style={screenStyle()}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar step={2} />
          <Heading
            eyebrow="Step 2 of 3 · Your firm"
            title="Tell us about the firm."
            lede="This sets up your matter numbering, playbooks and invoice header. You can change all of it later."
          />
        </div>
        <form
          className="cl-form"
          onSubmit={(e) => {
            e.preventDefault();
            go('su-team');
          }}
        >
          <Field label="Firm name">
            <Input
              id="su-firm"
              placeholder={DEMO_FIRM}
              value={firm}
              autoComplete="organization"
              onChange={(e) => setFirm(e.target.value)}
            />
          </Field>
          <div className="cl-form__row">
            <Field label="Firm size">
              <NativeSelect
                label="Firm size"
                value={firmSize}
                onChange={setFirmSize}
                options={['Just me', '2–10 people', '11–50 people', '51+ people'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            </Field>
            <Field label="State bar">
              <NativeSelect
                label="State bar"
                value={stateBar}
                onChange={setStateBar}
                options={['California', 'New York', 'Texas', 'Florida', 'Illinois'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            </Field>
          </div>
          <div className="cl-field">
            <label className="cl-field__label">
              <span>Practice areas</span>
              <span className="opt">Pick any</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRACTICES.map((p) => (
                <Chip
                  key={p}
                  active={!!practices[p]}
                  icon={practices[p] ? 'check' : undefined}
                  aria-pressed={!!practices[p]}
                  onClick={() => setPractices({ ...practices, [p]: !practices[p] })}
                >
                  {p}
                </Chip>
              ))}
            </div>
            <div className="cl-field__help">
              Each area installs a playbook: stages, deadline rules and flat-fee templates.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" size="lg" onClick={() => go('su-verify')}>
              Back
            </Button>
            <Button variant="primary" size="lg" type="submit" style={{ flex: 1 }}>
              Continue
            </Button>
          </div>
        </form>
      </div>
    );
  } else if (screen === 'su-team') {
    body = (
      <div style={screenStyle()}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar step={3} />
          <Heading
            eyebrow="Step 3 of 3 · Your team"
            title="Bring in the people who bill."
            lede="Invites carry a role and a default rate. Everyone gets the mobile app on day one."
          />
        </div>
        <form
          className="cl-form"
          onSubmit={(e) => {
            e.preventDefault();
            go('done');
          }}
        >
          {invites.map((inv, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 128px', gap: 8 }}
            >
              <Input
                type="email"
                aria-label={`Invite ${i + 1} email`}
                placeholder={INVITE_PLACEHOLDERS[Math.min(i, 2)]}
                value={inv.email}
                onChange={(e) =>
                  setInvites(invites.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                }
              />
              <NativeSelect
                label={`Invite ${i + 1} role`}
                value={inv.role}
                onChange={(role) =>
                  setInvites(invites.map((x, j) => (j === i ? { ...x, role } : x)))
                }
                options={ROLES.map((r) => ({ value: r, label: r }))}
              />
            </div>
          ))}
          <Button
            variant="tertiary"
            icon="plus"
            style={{ alignSelf: 'flex-start', paddingLeft: 4 }}
            onClick={() => setInvites([...invites, { email: '', role: 'Staff' }])}
          >
            Add another
          </Button>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" size="lg" onClick={() => go('done')}>
              Skip for now
            </Button>
            <Button variant="primary" size="lg" type="submit" style={{ flex: 1 }}>
              {inviteCount
                ? `Send ${inviteCount} invite${inviteCount > 1 ? 's' : ''}`
                : 'Send invites'}
            </Button>
          </div>
        </form>
      </div>
    );
  } else if (screen === 'done') {
    const fromSignup = flow === 'signup';
    body = (
      <div style={screenStyle(24)}>
        <span style={{ animation: 'cl-pop 420ms var(--ease-standard) both', display: 'flex' }}>
          <IconWell name="check" tone="success" size="lg" />
        </span>
        <Heading
          eyebrow={firmDisplay}
          title={
            fromSignup
              ? `Welcome to Clepso, ${(name.trim() || 'Dana').split(' ')[0]}.`
              : 'Welcome back, Dana.'
          }
          lede={
            fromSignup
              ? `Your firm workspace is ready. ${
                  PRACTICES.filter((p) => practices[p]).join(' and ') || 'Starter'
                } playbooks are installed; invites go out as soon as you open Today.`
              : 'Signed in on this device. You have 3 things to review from yesterday.'
          }
        />
        <div className="cl-list">
          <div className="cl-row">
            <IconWell name="shield" />
            <div className="cl-row__body">
              <div className="cl-row__title">Two-step verification is on</div>
              <div className="cl-row__sub">Codes go to ····4210</div>
            </div>
            <Pill tone="success" dot>
              Active
            </Pill>
          </div>
          <div className="cl-row">
            <IconWell name="face" />
            <div className="cl-row__body">
              <div className="cl-row__title">Biometric session on mobile</div>
              <div className="cl-row__sub">Set up when you open the app</div>
            </div>
            <Pill>Pending</Pill>
          </div>
        </div>
        <Button variant="primary" size="lg" block onClick={() => router.push('/today')}>
          Open Today
        </Button>
      </div>
    );
  } else if (screen === 'update') {
    body = (
      <div style={screenStyle()}>
        <Link href="/sign-in" style={{ ...backStyle, textDecoration: 'none' }}>
          <Icon name="chevron-left" size="sm" />
          Back to sign in
        </Link>
        <Heading
          title="Choose a new password."
          lede="Use a password you do not use on another account."
        />
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        <form className="cl-form" onSubmit={(e) => void submitUpdate(e)} noValidate>
          {passwordField('up-pw', 'new-password', 'At least 8 characters', strengthMeter)}
          <Button variant="primary" size="lg" block type="submit" loading={loading}>
            Save password
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="auth-grid"
      style={narrow ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}
    >
      <section className="auth-form-column">
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link
            href="/sign-in"
            aria-label="Clepso"
            style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ flex: 'none', color: 'var(--accent)' }}
            >
              <path
                d="M17.2 7.4A7.2 7.2 0 1 0 17.2 16.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              <circle cx="19.4" cy="12" r="2" fill="currentColor" />
            </svg>
            <Wordmark style={{ fontSize: 24, letterSpacing: '-0.035em', color: 'var(--ink)' }} />
          </Link>
          {themeButton}
        </header>
        <div className="auth-form-content">
          <div key={screen}>{body}</div>
        </div>
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            font: 'var(--text-caption)',
            color: 'var(--ink-3)',
            flexWrap: 'wrap',
          }}
        >
          <span>© 2026 Clepso · SOC 2 Type II · Data encrypted at rest</span>
          <span style={{ display: 'flex', gap: 14 }}>
            {['Privacy', 'Terms', 'Status'].map((label) => (
              <a
                key={label}
                href="#"
                style={{ color: 'inherit' }}
                onClick={(e) => e.preventDefault()}
              >
                {label}
              </a>
            ))}
          </span>
        </footer>
      </section>
      {narrow ? null : <AuthPreview />}
    </div>
  );
}
