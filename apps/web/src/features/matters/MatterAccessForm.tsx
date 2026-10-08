'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { changeMatterAccessSchema, type MatterAccessCandidates } from '@lawfirm/core';
import { Banner, Button, Field, Textarea } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import {
  prepareMatterAccessChange,
  submitMatterAccessChange,
  type MatterAccessIntent,
} from './matter-access';
import styles from './LiveMatters.module.css';

export function MatterAccessForm({
  client,
  firmId,
  matterId,
  revision,
  candidates,
  onChanged,
  onRefresh,
  onIntentChange,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  matterId: string;
  revision: number;
  candidates: MatterAccessCandidates['items'];
  onChanged: () => void;
  onRefresh: () => void;
  onIntentChange: (pending: boolean) => void;
}) {
  const [userId, setUserId] = useState(''),
    [role, setRole] = useState('reader'),
    [reason, setReason] = useState('');
  const [intent, setIntent] = useState<MatterAccessIntent>(),
    [busy, setBusy] = useState(false),
    [terminal, setTerminal] = useState(false),
    [message, setMessage] = useState('');
  const active = useRef(false),
    running = useRef(false),
    abort = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    onIntentChange(!!intent);
    return () => onIntentChange(false);
  }, [intent, onIntentChange]);
  const submit = async () => {
    if (running.current || terminal) return;
    const parsed = changeMatterAccessSchema.safeParse({
      userId,
      role: role === 'none' ? null : role,
      expectedRevision: revision,
      reason,
    });
    if (!parsed.success) {
      setMessage('Choose staff, access and a reason of 1–500 characters.');
      return;
    }
    const current = intent ?? prepareMatterAccessChange(parsed.data);
    setIntent(current);
    running.current = true;
    setBusy(true);
    setMessage('');
    abort.current = new AbortController();
    try {
      await submitMatterAccessChange(client, firmId, matterId, current, abort.current.signal);
      if (!active.current) return;
      setIntent(undefined);
      setReason('');
      setMessage('Access change recorded.');
      onChanged();
    } catch (error) {
      if (!active.current) return;
      const stopped = error instanceof ApiError && [401, 403, 404, 409, 422].includes(error.status);
      setTerminal(stopped);
      setMessage(
        error instanceof ApiError && error.code === 'LAST_MATTER_MANAGER'
          ? 'Assign another eligible matter manager before removing this manager.'
          : stopped
            ? 'This change is unavailable or access has changed. Review the latest access and history.'
            : 'The result could not be confirmed. Check the same access request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <form
      className="cl-stack cl-stack--md"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={<label htmlFor="matter-access-person">Staff member</label>}>
        <select
          id="matter-access-person"
          className={`cl-input ${styles.select}`}
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={!!intent}
        >
          <option value="">Choose current firm staff</option>
          {candidates.map((person) => (
            <option key={person.userId} value={person.userId}>
              {person.name ?? person.email} · {person.staffRole}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={<label htmlFor="matter-access-role">Access</label>}
        help="Manager access allows eligible staff to change assignments. Financial and client permissions have separate controls."
      >
        <select
          id="matter-access-role"
          className={`cl-input ${styles.select}`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={!!intent}
        >
          <option value="reader">Read access</option>
          <option
            value="manager"
            disabled={!candidates.find((p) => p.userId === userId)?.canManage}
          >
            Matter manager
          </option>
          <option value="none">Remove access</option>
        </select>
      </Field>
      <Field
        label={<label htmlFor="matter-access-reason">Reason for access change</label>}
        help="The reason is retained in this matter’s access history."
      >
        <Textarea
          id="matter-access-reason"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={!!intent}
        />
      </Field>
      {message && (
        <Banner
          role="status"
          tone={message === 'Access change recorded.' ? 'success' : 'warning'}
          title={message}
        />
      )}
      <div className={styles.actions}>
        {!terminal && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving access…' : intent ? 'Check access request' : 'Apply access change'}
          </Button>
        )}
        {terminal && (
          <Button
            type="button"
            onClick={() => {
              setIntent(undefined);
              setTerminal(false);
              setMessage('');
              onRefresh();
            }}
          >
            Review latest access
          </Button>
        )}
      </div>
    </form>
  );
}
