import { useQuery } from '@tanstack/react-query';
import { formatCents } from '@lawfirm/core';
import { contacts, events, invoices, matters, tasks, timeEntries } from './data';

/**
 * Mock-backed hooks, one per read the UI needs. When the backend lands,
 * each queryFn swaps to a supabase-js select or api-client call — the
 * queryKey, shape, and every consuming component stay untouched.
 */
const mock = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), 220));

export function useMatters() {
  return useQuery({ queryKey: ['matters'], queryFn: () => mock(matters) });
}

export function useMatter(id: string | undefined) {
  return useQuery({
    queryKey: ['matters', id],
    queryFn: () => mock(matters.find((m) => m.id === id) ?? null),
    enabled: !!id,
  });
}

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: () => mock(tasks) });
}

export function useTimeEntries() {
  return useQuery({ queryKey: ['time-entries'], queryFn: () => mock(timeEntries) });
}

export function useInvoices() {
  return useQuery({ queryKey: ['invoices'], queryFn: () => mock(invoices) });
}

export function useContacts() {
  return useQuery({ queryKey: ['contacts'], queryFn: () => mock(contacts) });
}

export function useUpcomingEvents() {
  return useQuery({ queryKey: ['events', 'upcoming'], queryFn: () => mock(events) });
}

// ── display helpers shared by screens ──────────────────────────────────────

export function money(cents: number): string {
  return formatCents(cents);
}

export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
