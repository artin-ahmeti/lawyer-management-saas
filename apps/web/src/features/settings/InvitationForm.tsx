'use client';
import {
  createStaffInvitationSchema,
  invitedStaffRoleSchema,
  type CreateStaffInvitation,
} from '@lawfirm/core';
import { Banner, Button, Field, Input } from '@lawfirm/ui-web';
import { useState } from 'react';
import styles from './StaffInvitations.module.css';
export const invitationRoleLabels = {
  admin: 'Administrator',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  billing: 'Billing staff',
  readonly: 'Read-only staff',
};
export function InvitationForm({ onReview }: { onReview: (input: CreateStaffInvitation) => void }) {
  const [email, setEmail] = useState(''),
    [role, setRole] = useState('attorney'),
    [invalid, setInvalid] = useState(false);
  return (
    <form
      className="cl-form"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = createStaffInvitationSchema.safeParse({ email, role });
        if (!parsed.success) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        onReview(parsed.data);
      }}
    >
      <Field label="Staff email (required)">
        <Input
          aria-label="Staff invitation email"
          type="email"
          value={email}
          required
          maxLength={254}
          autoComplete="off"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label="Staff role">
        <select
          className="cl-input"
          aria-label="Invited staff role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {invitedStaffRoleSchema.options.map((value) => (
            <option key={value} value={value}>
              {invitationRoleLabels[value]}
            </option>
          ))}
        </select>
      </Field>
      {invalid && (
        <Banner tone="warning" role="alert" title="Enter a valid email and staff role." />
      )}
      <div>
        <Button className={styles.control} type="submit" variant="primary">
          Review new invitation
        </Button>
      </div>
    </form>
  );
}
