'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reads } from './source';

/** Query keys, one namespace per aggregate; mutations invalidate by prefix. */
export const qk = {
  matters: ['matters'] as const,
  matter: (id: string) => ['matters', id] as const,
  tasks: ['tasks'] as const,
  contacts: ['contacts'] as const,
  inbox: ['inbox'] as const,
  documents: ['documents'] as const,
  events: ['events'] as const,
  deadlines: ['deadlines'] as const,
  timeEntries: ['time-entries'] as const,
  prebill: ['prebill'] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  payments: ['payments'] as const,
  trustLedger: (matterId: string) => ['trust', matterId] as const,
  trustRecent: ['trust', 'recent'] as const,
  matterActivity: (id: string) => ['activity', id] as const,
  review: ['review'] as const,
  alerts: ['alerts'] as const,
  reports: ['reports'] as const,
  timekeepers: ['timekeepers'] as const,
  playbooks: ['playbooks'] as const,
  integrations: ['integrations'] as const,
  billedExtra: ['billed-extra'] as const,
  expenses: ['expenses'] as const,
  settings: ['settings'] as const,
};

export const useMatters = () => useQuery({ queryKey: qk.matters, queryFn: reads.matters });
export const useMatter = (id: string | undefined) =>
  useQuery({ queryKey: qk.matter(id ?? ''), queryFn: () => reads.matter(id ?? ''), enabled: !!id });
export const useTasks = () => useQuery({ queryKey: qk.tasks, queryFn: reads.tasks });
export const useContacts = () => useQuery({ queryKey: qk.contacts, queryFn: reads.contacts });
export const useInbox = () => useQuery({ queryKey: qk.inbox, queryFn: reads.inbox });
export const useDocuments = () => useQuery({ queryKey: qk.documents, queryFn: reads.documents });
export const useEvents = () => useQuery({ queryKey: qk.events, queryFn: reads.events });
export const useDeadlines = () => useQuery({ queryKey: qk.deadlines, queryFn: reads.deadlines });
export const useTimeEntries = () =>
  useQuery({ queryKey: qk.timeEntries, queryFn: reads.timeEntries });
export const usePrebill = () => useQuery({ queryKey: qk.prebill, queryFn: reads.prebill });
export const useInvoices = () => useQuery({ queryKey: qk.invoices, queryFn: reads.invoices });
export const useInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: qk.invoice(id ?? ''),
    queryFn: () => reads.invoice(id ?? ''),
    enabled: !!id,
  });
export const usePayments = () => useQuery({ queryKey: qk.payments, queryFn: reads.payments });
export const useTrustLedger = (matterId: string) =>
  useQuery({ queryKey: qk.trustLedger(matterId), queryFn: () => reads.trustLedger(matterId) });
export const useTrustRecent = () =>
  useQuery({ queryKey: qk.trustRecent, queryFn: reads.trustRecent });
export const useMatterActivity = (matterId: string) =>
  useQuery({
    queryKey: qk.matterActivity(matterId),
    queryFn: () => reads.matterActivity(matterId),
  });
export const useReviewItems = () => useQuery({ queryKey: qk.review, queryFn: reads.review });
export const useAlerts = () => useQuery({ queryKey: qk.alerts, queryFn: reads.alerts });
export const useReports = () => useQuery({ queryKey: qk.reports, queryFn: reads.reports });
export const useTimekeepers = () =>
  useQuery({ queryKey: qk.timekeepers, queryFn: reads.timekeepers });
export const usePlaybooks = () => useQuery({ queryKey: qk.playbooks, queryFn: reads.playbooks });
export const useIntegrations = () =>
  useQuery({ queryKey: qk.integrations, queryFn: reads.integrations });
export const useBilledExtraMinutes = () =>
  useQuery({ queryKey: qk.billedExtra, queryFn: reads.billedExtraMinutes });
export const useExpenses = () => useQuery({ queryKey: qk.expenses, queryFn: reads.expenses });
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: reads.settings });

/** Invalidate everything after a write; the mock store is one document, the API will scope this. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries(), [qc]);
}
