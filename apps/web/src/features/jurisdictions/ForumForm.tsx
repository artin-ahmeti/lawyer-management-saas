'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  jurisdictionName,
  type ForumKind,
  type ForumRecord,
  type JurisdictionCode,
} from '@lawfirm/core';
import { Banner, Button, Field, Input } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { JurisdictionSelect } from './JurisdictionSelect';
import {
  forumKinds,
  prepareForumCommand,
  submitForumCommand,
  type ForumCommand,
} from './live-jurisdictions';
import styles from './Jurisdictions.module.css';

/**
 * Adds a court, agency, tribunal or other body. A fixed jurisdiction comes from the reference
 * being recorded. One intent survives an uncertain result, so a retry never adds a second forum.
 */
export function ForumForm({
  client,
  firmId,
  idPrefix,
  jurisdiction,
  defaultKind = 'court',
  onSaved,
  onCancel,
  onNameTaken,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  idPrefix: string;
  jurisdiction?: string;
  defaultKind?: ForumKind;
  onSaved: (forum: ForumRecord) => void;
  onCancel: () => void;
  /** The existing forum may be missing from a list loaded earlier; let the caller refresh it. */
  onNameTaken?: () => void;
}) {
  const [name, setName] = useState(''),
    [kind, setKind] = useState<ForumKind>(defaultKind),
    [place, setPlace] = useState(jurisdiction ?? '');
  const [intent, setIntent] = useState<ForumCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false);
  useEffect(() => {
    active.current = true;
    // The form replaces the control that opened it, so focus moves to its heading.
    document.getElementById(`${idPrefix}-heading`)?.focus();
    return () => {
      active.current = false;
    };
  }, [idPrefix]);
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      try {
        current = prepareForumCommand({
          kind: 'create',
          input: { name, kind, jurisdiction: place as JurisdictionCode },
        });
      } catch {
        setError('Enter a name of up to 200 characters and choose a jurisdiction.');
        return;
      }
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const { forum } = await submitForumCommand(client, current, firmId);
      if (active.current) onSaved(forum);
    } catch (e) {
      if (!active.current) return;
      if (e instanceof ApiError && e.code === 'FORUM_NAME_TAKEN') {
        // A clash is recoverable: the next attempt is a new intent with another name.
        setIntent(undefined);
        setError(
          'An active forum in this jurisdiction already uses this name. Choose it from the list or use another name.',
        );
        onNameTaken?.();
        return;
      }
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        final
          ? 'The forum could not be added. Refresh to review your current access.'
          : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <form
      className={`cl-stack cl-stack--md ${styles.subform}`}
      aria-labelledby={`${idPrefix}-heading`}
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h3 id={`${idPrefix}-heading`} tabIndex={-1} className="cl-t-title-3">
        New forum{jurisdiction ? ` in ${jurisdictionName(jurisdiction as JurisdictionCode)}` : ''}
      </h3>
      <div className={styles.grid}>
        <Field label={<span id={`${idPrefix}-name-label`}>Name</span>}>
          <Input
            aria-labelledby={`${idPrefix}-name-label`}
            value={name}
            maxLength={200}
            required
            disabled={!!intent}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={<span id={`${idPrefix}-kind-label`}>Kind</span>}>
          <select
            aria-labelledby={`${idPrefix}-kind-label`}
            className={`cl-input ${styles.select}`}
            value={kind}
            disabled={!!intent}
            onChange={(e) => setKind(e.target.value as ForumKind)}
          >
            {forumKinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        {!jurisdiction && (
          <Field label={<span id={`${idPrefix}-jurisdiction-label`}>Jurisdiction</span>}>
            <JurisdictionSelect
              labelledBy={`${idPrefix}-jurisdiction-label`}
              value={place}
              disabled={!!intent}
              onChange={setPlace}
            />
          </Field>
        )}
      </div>
      {error && <Banner role="alert" tone="warning" title={error} />}
      <div className={styles.actions}>
        {!terminal && (
          <Button type="submit" variant="primary" disabled={busy || !name.trim() || !place}>
            {busy ? 'Adding forum…' : intent ? 'Check forum request' : 'Add forum'}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          {terminal ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </form>
  );
}
