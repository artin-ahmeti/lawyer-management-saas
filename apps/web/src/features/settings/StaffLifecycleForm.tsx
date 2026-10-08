'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  removeStaffMembershipSchema,
  restoreStaffMembershipSchema,
  type FirmRole,
} from '@lawfirm/core';
import { Banner, Button, Checkbox, Field, Textarea } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import {
  prepareStaffMembershipChange,
  submitStaffMembershipChange,
  type StaffMembershipIntent,
} from './staff-lifecycle';
import styles from './StaffRoles.module.css';

type Person = {
  userId: string;
  name: string | null;
  email: string | null;
  role: FirmRole;
  revision: number;
  isAvailable: boolean;
};
const copy = {
  remove: {
    person: 'Staff member to remove (required)',
    choose: 'Choose current firm staff',
    reason: 'Reason for removal (required)',
    submit: 'Remove staff member',
    pending: 'Removing…',
    check: 'Check removal request',
    done: 'Staff member removed.',
  },
  restore: {
    person: 'Removed staff member (required)',
    choose: 'Choose removed staff',
    reason: 'Reason for restoration (required)',
    submit: 'Restore staff member',
    pending: 'Restoring…',
    check: 'Check restoration request',
    done: 'Staff member restored.',
  },
};
const conflicts: Record<string, string> = {
  LAST_FIRM_OWNER: 'Assign another available firm owner before removing this owner.',
  MATTER_HANDOFF_REQUIRED:
    'An authorized matter manager must complete a handoff before this removal.',
  OWNER_REQUIRED: 'A current firm owner must review owner memberships.',
  STAFF_UNAVAILABLE: 'This account is unavailable. It cannot be restored until it is active.',
};

export function StaffLifecycleForm({
  client,
  firmId,
  mode,
  people,
  assignableRoles,
  currentUserId,
  onChanged,
  onRefresh,
  onIntentChange,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  mode: 'remove' | 'restore';
  people: Person[];
  assignableRoles: FirmRole[];
  currentUserId: string;
  onChanged: () => void;
  onRefresh: () => void;
  onIntentChange: (pending: boolean) => void;
}) {
  const text = copy[mode],
    id = (field: string) => `staff-${mode}-${field}`;
  const [person, setPerson] = useState<Person>(),
    [role, setRole] = useState<string>('attorney'),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  const [intent, setIntent] = useState<StaffMembershipIntent>(),
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
  const reset = () => {
    setIntent(undefined);
    setPerson(undefined);
    setReason('');
    setRole('attorney');
    setConfirmed(false);
  };
  const submit = async () => {
    if (running.current || terminal) return;
    const fields = { userId: person?.userId, expectedRevision: person?.revision, reason };
    const removal = removeStaffMembershipSchema.safeParse(fields),
      restoration = restoreStaffMembershipSchema.safeParse({ ...fields, role });
    const change =
      mode === 'remove'
        ? removal.success && confirmed
          ? { action: 'remove' as const, input: removal.data }
          : undefined
        : restoration.success
          ? { action: 'restore' as const, input: restoration.data }
          : undefined;
    if (!intent && !change) {
      setMessage(
        mode === 'remove'
          ? 'Choose staff, confirm the access removal and give a reason of 1–500 characters.'
          : 'Choose removed staff, a role and a reason of 1–500 characters.',
      );
      return;
    }
    const current = intent ?? prepareStaffMembershipChange(change!);
    setIntent(current);
    running.current = true;
    setBusy(true);
    setMessage('');
    abort.current = new AbortController();
    try {
      await submitStaffMembershipChange(client, firmId, current, abort.current.signal);
      if (!active.current) return;
      reset();
      setMessage(text.done);
      onChanged();
    } catch (error) {
      if (!active.current) return;
      const stopped = error instanceof ApiError && [401, 403, 404, 409, 422].includes(error.status);
      setTerminal(stopped);
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) onRefresh();
      setMessage(
        (error instanceof ApiError && error.code && conflicts[error.code]) ||
          (stopped
            ? 'This change is unavailable or staff access changed. Review the latest staff and history.'
            : `The result could not be confirmed. ${text.check} to recover it safely.`),
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  const confirmText =
    person?.userId === currentUserId
      ? 'Remove my own firm access and revoke my matter access'
      : 'Revoke their firm access and all of their matter access';
  return (
    <form
      className="cl-stack cl-stack--md"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={<label htmlFor={id('person')}>{text.person}</label>}>
        <select
          id={id('person')}
          className={`cl-input ${styles.select}`}
          required
          value={person?.userId ?? ''}
          onChange={(e) => {
            const selected = people.find((p) => p.userId === e.target.value);
            setPerson(selected);
            if (selected && assignableRoles.includes(selected.role)) setRole(selected.role);
          }}
          disabled={!!intent}
        >
          <option value="">{text.choose}</option>
          {people.map((p) => (
            <option
              key={p.userId}
              value={p.userId}
              disabled={
                (mode === 'restore' && !p.isAvailable) ||
                (mode === 'remove' && p.role === 'owner' && !assignableRoles.includes('owner'))
              }
            >
              {p.name ?? p.email ?? 'Unnamed account'} · {p.role}
              {p.userId === currentUserId ? ' · You' : ''}
            </option>
          ))}
        </select>
      </Field>
      {mode === 'restore' && (
        <Field
          label={<label htmlFor={id('role')}>Role on return (required)</label>}
          help="Matter access is not restored. Matter managers grant it again where needed."
        >
          <select
            id={id('role')}
            className={`cl-input ${styles.select}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!!intent}
          >
            {assignableRoles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field
        label={<label htmlFor={id('reason')}>{text.reason}</label>}
        help="Retained in firm staff history for owners and admins; keep restricted matter details out."
      >
        <Textarea
          id={id('reason')}
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={!!intent}
        />
      </Field>
      {mode === 'remove' && (
        <label className={styles.check}>
          <Checkbox
            id={id('confirm')}
            shape="square"
            label={confirmText}
            checked={confirmed}
            onChange={setConfirmed}
            disabled={!!intent}
          />
          <span aria-hidden="true">{confirmText}</span>
        </label>
      )}
      {message && (
        <Banner
          role="status"
          tone={message === text.done ? 'success' : 'warning'}
          title={message}
        />
      )}
      <div className={styles.actions}>
        {!terminal && (
          <Button
            type="submit"
            variant={mode === 'remove' ? 'destructive' : 'primary'}
            disabled={busy}
          >
            {busy ? text.pending : intent ? text.check : text.submit}
          </Button>
        )}
        {terminal && (
          <Button
            type="button"
            onClick={() => {
              reset();
              setTerminal(false);
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
