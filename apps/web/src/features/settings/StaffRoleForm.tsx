'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { changeStaffRoleSchema, type FirmStaffList } from '@lawfirm/core';
import { Banner, Button, Field, Textarea } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { prepareStaffRoleChange, submitStaffRoleChange, type StaffRoleIntent } from './staff-roles';
import styles from './StaffRoles.module.css';

export function StaffRoleForm({
  client,
  firmId,
  staff,
  onChanged,
  onRefresh,
  onIntentChange,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  staff: FirmStaffList;
  onChanged: () => void;
  onRefresh: () => void;
  onIntentChange: (pending: boolean) => void;
}) {
  const [person, setPerson] = useState<FirmStaffList['items'][number]>(),
    [role, setRole] = useState('attorney'),
    [reason, setReason] = useState('');
  const [intent, setIntent] = useState<StaffRoleIntent>(),
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
    const parsed = changeStaffRoleSchema.safeParse({
      userId: person?.userId,
      role,
      expectedRevision: person?.revision,
      reason,
    });
    if (!parsed.success) {
      setMessage('Choose staff, a role and a reason of 1–500 characters.');
      return;
    }
    const current = intent ?? prepareStaffRoleChange(parsed.data);
    setIntent(current);
    running.current = true;
    setBusy(true);
    setMessage('');
    abort.current = new AbortController();
    try {
      await submitStaffRoleChange(client, firmId, current, abort.current.signal);
      if (!active.current) return;
      setIntent(undefined);
      setReason('');
      setPerson(undefined);
      setMessage('Role change recorded.');
      onChanged();
    } catch (error) {
      if (!active.current) return;
      const stopped = error instanceof ApiError && [401, 403, 404, 409, 422].includes(error.status);
      setTerminal(stopped);
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) onRefresh();
      setMessage(
        error instanceof ApiError && error.code === 'LAST_FIRM_OWNER'
          ? 'Assign another available firm owner before changing this owner role.'
          : error instanceof ApiError && error.code === 'MATTER_HANDOFF_REQUIRED'
            ? 'An authorized matter manager must complete a handoff before this role change.'
            : stopped
              ? 'This change is unavailable or staff access changed. Review the latest staff and history.'
              : 'The result could not be confirmed. Check the same role request to recover it safely.',
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
      <Field label={<label htmlFor="staff-role-person">Staff member (required)</label>}>
        <select
          id="staff-role-person"
          className={`cl-input ${styles.select}`}
          required
          value={person?.userId ?? ''}
          onChange={(e) => {
            const selected = staff.items.find((p) => p.userId === e.target.value);
            setPerson(selected);
            if (selected) setRole(selected.role);
          }}
          disabled={!!intent}
        >
          <option value="">Choose current firm staff</option>
          {staff.items.map((person) => (
            <option
              key={person.userId}
              value={person.userId}
              disabled={
                !person.isAvailable ||
                (person.role === 'owner' && !staff.assignableRoles.includes('owner'))
              }
            >
              {person.name ?? person.email} · {person.role}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={<label htmlFor="staff-role-role">New staff role (required)</label>}
        help="Matter, financial and client permissions have separate controls."
      >
        <select
          id="staff-role-role"
          className={`cl-input ${styles.select}`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={!!intent}
        >
          {staff.assignableRoles.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={<label htmlFor="staff-role-reason">Reason for role change (required)</label>}
        help="Use a staffing reason. It is retained in firm staff history; keep restricted matter details out."
      >
        <Textarea
          id="staff-role-reason"
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
          tone={message === 'Role change recorded.' ? 'success' : 'warning'}
          title={message}
        />
      )}
      <div className={styles.actions}>
        {!terminal && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving role…' : intent ? 'Check role request' : 'Apply role change'}
          </Button>
        )}
        {terminal && (
          <Button
            type="button"
            onClick={() => {
              setIntent(undefined);
              setTerminal(false);
              setPerson(undefined);
              setMessage('');
              onRefresh();
            }}
          >
            Review latest staff
          </Button>
        )}
      </div>
    </form>
  );
}
