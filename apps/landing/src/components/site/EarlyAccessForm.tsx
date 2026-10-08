'use client';

import { useId, useState, type FormEvent } from 'react';
import { site } from '@/config/site';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { FIRM_SIZES, type EarlyAccessResult } from '@/lib/early-access';
import { buttonClass } from '../ui/button-styles';
import { Icon } from '../ui/Icon';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; result: EarlyAccessResult };

const field =
  'mt-1.5 block h-11 w-full rounded-md border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus-visible:border-accent';

/** Minimal enquiry form. Shows success only after the server confirms delivery. */
export function EarlyAccessForm({ onDone }: { onDone?: () => void }) {
  const id = useId();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const errors =
    state.kind === 'done' && state.result.status === 'invalid' ? state.result.fieldErrors : {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState({ kind: 'sending' });
    let result: EarlyAccessResult;
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      result = (await res.json()) as EarlyAccessResult;
    } catch {
      result = { status: 'error' };
    }
    track({ name: 'early_access_submit', result: result.status });
    setState({ kind: 'done', result });
  }

  if (state.kind === 'done' && state.result.status === 'received') {
    return (
      <div role="status" className="rounded-lg border border-hairline bg-surface p-5">
        <p className="flex items-center gap-2 text-title-3 text-ink">
          <Icon name="check" className="text-success-ink" /> Thanks. Your request reached the Clepso
          team.
        </p>
        <p className="mt-2 text-body-sm text-ink-2">
          We will reply to the email address you gave us.
        </p>
        {onDone ? (
          <button type="button" onClick={onDone} className={buttonClass('secondary', 'md', 'mt-5')}>
            Close
          </button>
        ) : null}
      </div>
    );
  }

  const notConfigured = state.kind === 'done' && state.result.status === 'not-configured';
  const failed = state.kind === 'done' && state.result.status === 'error';

  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-describedby={`${id}-note`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-label text-ink-2">
          Name
          <input
            name="name"
            autoComplete="name"
            required
            className={field}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${id}-name` : undefined}
          />
          {errors.name ? (
            <span id={`${id}-name`} className="mt-1 block text-caption text-danger-ink">
              {errors.name}
            </span>
          ) : null}
        </label>
        <label className="text-label text-ink-2">
          Work email
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className={field}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${id}-email` : undefined}
          />
          {errors.email ? (
            <span id={`${id}-email`} className="mt-1 block text-caption text-danger-ink">
              {errors.email}
            </span>
          ) : null}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-label text-ink-2">
          Firm <span className="text-ink-3">(optional)</span>
          <input name="firm" autoComplete="organization" className={field} />
        </label>
        <label className="text-label text-ink-2">
          Firm size
          <select
            name="firmSize"
            required
            defaultValue=""
            className={cn(field, 'appearance-none')}
            aria-invalid={Boolean(errors.firmSize)}
            aria-describedby={errors.firmSize ? `${id}-size` : undefined}
          >
            <option value="" disabled>
              Choose one
            </option>
            {FIRM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.firmSize ? (
            <span id={`${id}-size`} className="mt-1 block text-caption text-danger-ink">
              {errors.firmSize}
            </span>
          ) : null}
        </label>
      </div>
      <label className="text-label text-ink-2">
        What would you like Clepso to handle? <span className="text-ink-3">(optional)</span>
        <textarea name="message" rows={3} className={cn(field, 'h-auto py-2.5')} />
      </label>
      {/* Honeypot, hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {notConfigured ? (
        <p
          role="alert"
          className="rounded-md border border-warning-dot/40 bg-warning-bg px-3 py-2.5 text-body-sm text-warning-ink"
        >
          Preview build: no enquiry destination is configured, so nothing was sent. Your details
          were not stored.
        </p>
      ) : null}
      {failed ? (
        <p
          role="alert"
          className="rounded-md border border-danger-ink/40 px-3 py-2.5 text-body-sm text-danger-ink"
        >
          We could not send your request. Please try again in a moment.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p id={`${id}-note`} className="max-w-[34ch] text-caption text-ink-3">
          We use these details only to reply about early access.
          {site.privacyUrl ? (
            <>
              {' '}
              <a href={site.privacyUrl} className="text-accent underline underline-offset-2">
                Privacy notice
              </a>
            </>
          ) : null}
        </p>
        <button
          type="submit"
          disabled={state.kind === 'sending'}
          className={buttonClass('primary', 'md')}
        >
          {state.kind === 'sending' ? 'Sending…' : 'Request early access'}
        </button>
      </div>
    </form>
  );
}
