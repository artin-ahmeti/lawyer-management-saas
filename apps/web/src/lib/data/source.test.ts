import { afterEach, describe, expect, it } from 'vitest';
import { mockDb } from './store';
import { paymentInstallments, writes } from './source';

const baseline = structuredClone(mockDb.get());
afterEach(() => {
  mockDb.transact((draft) => Object.assign(draft, structuredClone(baseline)));
});

describe('mock writes', () => {
  it('bills a review item into a time entry and can undo it', () => {
    const before = mockDb.get();
    const item = before.review[0]!;
    const undo = writes.billReview(item.id);
    const after = mockDb.get();
    expect(after.review.find((r) => r.id === item.id)).toBeUndefined();
    expect(after.billedExtraMinutes).toBe(before.billedExtraMinutes + Math.round(item.hours * 60));
    expect(after.timeEntries[0]?.matterId).toBe(item.matterId);
    undo();
    expect(mockDb.get()).toBe(before);
  });

  it('records a payment: balance to zero, status paid, payment row added', () => {
    const undo = writes.recordPayment({
      invoiceId: 'i1',
      amountCents: mockDb.get().invoices.find((i) => i.id === 'i1')!.balanceCents,
      method: 'ACH',
      date: '2026-09-29',
    });
    const inv = mockDb.get().invoices.find((i) => i.id === 'i1')!;
    expect(inv.status).toBe('paid');
    expect(inv.balanceCents).toBe(0);
    expect(mockDb.get().payments[0]?.invoiceNumber).toBe('INV-2026-078');
    undo();
    expect(mockDb.get().invoices.find((i) => i.id === 'i1')!.status).toBe('overdue');
  });

  it('writes down a pre-bill entry in six-minute steps and keeps the original', () => {
    writes.adjustPrebillMinutes('p1', -6);
    const p = mockDb.get().prebill.find((x) => x.id === 'p1')!;
    expect(p.minutes).toBe(90);
    expect(p.originalMinutes).toBe(96);
    expect(p.reason).toBe('Adjusted at review');
  });

  it('preserves a later task when undoing an earlier task change', () => {
    const task = mockDb.get().tasks[0]!;
    const undo = writes.toggleTask(task.id);
    writes.createTask({
      title: 'Later work',
      matterId: 'm2',
      assignee: 'D. Okafor',
      dueAt: '2026-10-03',
    });
    undo();
    expect(mockDb.get().tasks.find((t) => t.id === task.id)?.done).toBe(task.done);
    expect(mockDb.get().tasks.some((t) => t.title === 'Later work')).toBe(true);
  });

  it('records partial payments then settles the exact remaining balance', () => {
    const balance = mockDb.get().invoices.find((i) => i.id === 'i1')!.balanceCents;
    writes.recordPayment({
      invoiceId: 'i1',
      amountCents: 10001,
      method: 'Check',
      date: '2026-09-29',
    });
    expect(mockDb.get().invoices.find((i) => i.id === 'i1')).toMatchObject({
      status: 'partial',
      balanceCents: balance - 10001,
    });
    writes.recordPayment({
      invoiceId: 'i1',
      amountCents: balance - 10001,
      method: 'ACH',
      date: '2026-09-29',
    });
    expect(mockDb.get().invoices.find((i) => i.id === 'i1')).toMatchObject({
      status: 'paid',
      balanceCents: 0,
    });
    expect(
      mockDb
        .get()
        .payments.slice(0, 2)
        .reduce((sum, p) => sum + p.amountCents, 0),
    ).toBe(balance);
  });

  it('rejects invalid payments without changing any data', () => {
    const before = mockDb.get();
    const input = {
      invoiceId: 'i1',
      amountCents: 99999999,
      method: 'ACH' as const,
      date: '2026-09-29',
    };
    expect(() => writes.recordPayment(input)).toThrow('balance');
    expect(() => writes.recordPayment({ ...input, amountCents: -1 })).toThrow();
    expect(() => writes.recordPayment({ ...input, amountCents: 0.1 })).toThrow();
    expect(mockDb.get()).toBe(before);
  });

  it('keeps trust payments inside the selected client balance', () => {
    const before = mockDb.get();
    const trust = before.matters.find((m) => m.id === 'm2')!.trustCents!;
    expect(() =>
      writes.trustTransaction({
        matterId: 'm2',
        amountCents: trust + 1,
        description: 'Transfer',
        kind: 'disbursement',
      }),
    ).toThrow('Insufficient');
    writes.recordPayment({
      invoiceId: 'i1',
      amountCents: 10000,
      method: 'Trust',
      date: '2026-09-29',
    });
    expect(mockDb.get().matters.find((m) => m.id === 'm2')!.trustCents).toBe(trust - 10000);
    expect(mockDb.get().trustLedgers.m2?.[0]).toMatchObject({
      disbursementCents: 10000,
      balanceCents: trust - 10000,
    });
    expect(mockDb.get().matters.find((m) => m.id === 'm1')!.trustCents).toBe(
      before.matters.find((m) => m.id === 'm1')!.trustCents,
    );
  });

  it('does not undo a payment over newer financial changes', () => {
    const undo = writes.recordPayment({
      invoiceId: 'i1',
      amountCents: 10000,
      method: 'ACH',
      date: '2026-09-29',
    });
    writes.recordPayment({
      invoiceId: 'i1',
      amountCents: 10000,
      method: 'ACH',
      date: '2026-09-29',
    });
    const committed = mockDb.get();
    expect(undo).toThrow('newer changes');
    expect(mockDb.get()).toBe(committed);
  });

  it('rounds captured time into prebill, creates one invoice, and links the time entry', () => {
    writes.logTime({
      matterId: 'm2',
      minutes: 7,
      narrative: 'Client conference',
      code: 'L120',
      billable: true,
      rateCents: 32500,
      timekeeper: 'L. Tran',
    });
    const time = mockDb.get().timeEntries[0]!;
    expect(time).toMatchObject({ minutes: 12, amountCents: 6500 });
    const prebill = mockDb.get().prebill.find((p) => p.timeEntryId === time.id)!;
    writes.patchPrebill(prebill.id, { approved: true });
    const count = mockDb.get().invoices.length;
    writes.generateInvoices('m2');
    const invoice = mockDb.get().invoices[0]!;
    expect(invoice.totalCents).toBe(6500);
    expect(mockDb.get().timeEntries.find((t) => t.id === time.id)?.invoiceId).toBe(invoice.id);
    writes.generateInvoices('m2');
    expect(mockDb.get().invoices.length).toBe(count + 1);
  });

  it('allocates installment cents exactly with no floating point remainder', () => {
    expect(paymentInstallments(10001, 3)).toEqual([3333, 3333, 3335]);
    expect(paymentInstallments(10001, 6).reduce((a, b) => a + b, 0)).toBe(10001);
    expect(() => paymentInstallments(10001, 5)).toThrow();
  });

  it('invoices a billable expense once and applies the configured payment terms', () => {
    writes.patchSettings({ defaultTerms: 'Net 15' });
    writes.createExpense({
      matterId: 'm2',
      date: '2026-09-29',
      amountCents: 10101,
      description: 'Filing fee',
      billable: true,
    });
    const expense = mockDb.get().expenses[0]!;
    const line = mockDb.get().prebill.find((p) => p.expenseId === expense.id)!;
    writes.patchPrebill(line.id, { approved: true });
    writes.generateInvoices('m2');
    const invoice = mockDb.get().invoices[0]!;
    expect(invoice).toMatchObject({
      feesCents: 0,
      expensesCents: 10101,
      totalCents: 10101,
      terms: 'Net 15',
      dueAt: '2026-10-14',
    });
    expect(mockDb.get().expenses.find((e) => e.id === expense.id)?.invoiceId).toBe(invoice.id);
    const count = mockDb.get().invoices.length;
    writes.generateInvoices('m2');
    expect(mockDb.get().invoices.length).toBe(count);
  });
});
