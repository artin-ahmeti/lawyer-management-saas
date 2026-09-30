'use client';

import { useCallback } from 'react';
import { useInvalidateAll } from './queries';
import { writes, type LogTimeInput, type PaymentInput } from './source';
import type { PrebillEntry, WorkspaceSettings, PlanKey } from './types';

type Undo = () => void;

/**
 * Write hooks. Each returns a function that performs the write, refreshes the
 * queries and resolves with an `undo` for the confirmation toast. When the API
 * lands these become `useMutation`s posting to `@lawfirm/api-client`.
 */
export function useWrites() {
  const invalidate = useInvalidateAll();
  const run = useCallback(
    (undo: Undo): Undo => {
      void invalidate();
      return () => {
        undo();
        void invalidate();
      };
    },
    [invalidate],
  );
  return {
    toggleTask: (id: string) => run(writes.toggleTask(id)),
    billReview: (id: string) => run(writes.billReview(id)),
    skipReview: (id: string) => run(writes.skipReview(id)),
    billAllReview: () => run(writes.billAllReview()),
    logTime: (input: LogTimeInput) => run(writes.logTime(input)),
    patchPrebill: (id: string, patch: Partial<PrebillEntry>) => run(writes.patchPrebill(id, patch)),
    adjustPrebillMinutes: (id: string, delta: number) =>
      run(writes.adjustPrebillMinutes(id, delta)),
    textPayLink: (invoiceId: string) => run(writes.setInvoiceState(invoiceId, 'texted')),
    sendInvoice: (invoiceId: string) => run(writes.setInvoiceState(invoiceId, 'sent')),
    recordPayment: (input: PaymentInput) => run(writes.recordPayment(input)),
    createMatter: (input: Parameters<typeof writes.createMatter>[0]) =>
      run(writes.createMatter(input)),
    createContact: (input: Parameters<typeof writes.createContact>[0]) =>
      run(writes.createContact(input)),
    createTask: (input: Parameters<typeof writes.createTask>[0]) => run(writes.createTask(input)),
    createEvent: (input: Parameters<typeof writes.createEvent>[0]) =>
      run(writes.createEvent(input)),
    createExpense: (input: Parameters<typeof writes.createExpense>[0]) =>
      run(writes.createExpense(input)),
    createNote: (input: Parameters<typeof writes.createNote>[0]) => run(writes.createNote(input)),
    uploadDocuments: (
      matterId: string,
      folder: string,
      files: Parameters<typeof writes.uploadDocuments>[2],
    ) => run(writes.uploadDocuments(matterId, folder, files)),
    markFiled: (matterId: string) => run(writes.markFiled(matterId)),
    generateInvoices: (matterId?: string) => run(writes.generateInvoices(matterId)),
    approvePrebill: (matterId?: string) => run(writes.approvePrebill(matterId)),
    setPaymentPlan: (invoiceId: string, count: number, auto: boolean) =>
      run(writes.setPaymentPlan(invoiceId, count, auto)),
    trustTransaction: (input: Parameters<typeof writes.trustTransaction>[0]) =>
      run(writes.trustTransaction(input)),
    patchSettings: (patch: Partial<WorkspaceSettings>) => run(writes.patchSettings(patch)),
    changePlan: (key: PlanKey, cycle: 'annual' | 'monthly') => run(writes.changePlan(key, cycle)),
    inviteUser: (name: string, email: string) => run(writes.inviteUser(name, email)),
    markAlertsRead: () => run(writes.markAlertsRead()),
    togglePlaybook: (name: string) => run(writes.togglePlaybook(name)),
    toggleIntegration: (name: string) => run(writes.toggleIntegration(name)),
    removeInboxItem: (id: string) => run(writes.removeInboxItem(id)),
  };
}
