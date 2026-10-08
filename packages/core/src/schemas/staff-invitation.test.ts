import { expect, it } from 'vitest';
import {
  createStaffInvitationSchema,
  invitationRevisionSchema,
  invitationCursorSchema,
  staffInvitationCommandResultSchema,
} from './staff-invitation.js';
const id = '00000000-0000-4000-a000-000000000001';
it('bounds invitation intent and rejects owner authority, ambiguous recipients and extra fields', () => {
  expect(
    createStaffInvitationSchema.parse({ email: ' Lawyer@Example.com ', role: 'attorney' }),
  ).toEqual({ email: 'lawyer@example.com', role: 'attorney' });
  for (const bad of [
    { email: 'bad', role: 'attorney' },
    { email: 'a@example.com\nBcc:other@example.com', role: 'attorney' },
    { email: 'a@example.com', role: 'owner' },
    { email: 'a@example.com', role: 'client' },
    { email: 'a@example.com', role: 'attorney', firmId: id },
  ])
    expect(createStaffInvitationSchema.safeParse(bad).success).toBe(false);
  expect(invitationRevisionSchema.safeParse({ expectedRevision: 0 }).success).toBe(false);
  expect(invitationRevisionSchema.safeParse({ expectedRevision: 1, userId: id }).success).toBe(
    false,
  );
});
it('requires paired cursors and never represents a prepared invitation as an email delivery or owner claim', () => {
  expect(invitationCursorSchema.parse({})).toEqual({});
  expect(invitationCursorSchema.safeParse({ beforeId: id }).success).toBe(false);
  expect(
    invitationCursorSchema.safeParse({ beforeId: id, beforeCreatedAt: '2026-10-07T00:00:00Z' })
      .success,
  ).toBe(true);
  const value = {
    invitationId: id,
    firmId: id,
    commandId: id,
    revision: 1,
    status: 'pending',
    delivery: 'unavailable',
    requiresSessionRefresh: false,
  };
  expect(staffInvitationCommandResultSchema.parse(value)).toEqual(value);
  expect(staffInvitationCommandResultSchema.safeParse({ ...value, delivery: 'sent' }).success).toBe(
    false,
  );
  expect(
    staffInvitationCommandResultSchema.safeParse({
      ...value,
      status: 'accepted',
      requiresSessionRefresh: false,
    }).success,
  ).toBe(false);
});
