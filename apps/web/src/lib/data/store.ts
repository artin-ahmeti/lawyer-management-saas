import * as fx from './fixtures';
import type {
  Alert,
  Contact,
  DocumentFile,
  InboxItem,
  Integration,
  Invoice,
  Matter,
  Payment,
  Playbook,
  PrebillEntry,
  ReviewItem,
  Task,
  TimeEntry,
  Timekeeper,
  CalendarEvent,
  Expense,
  MatterNote,
  TrustLedgerEntry,
  WorkspaceSettings,
} from './types';

/**
 * In-memory stand-in for the API + RLS reads. It owns a mutable copy of the
 * fixtures so the H1 flows (bill a review item, approve a pre-bill entry, text
 * a pay link, record a payment…) behave end to end. Every mutation clones the
 * affected slice, applies the change and returns an `undo` closure; the React
 * Query layer invalidates after each call exactly as it will with the real API.
 */
export interface MockState {
  matters: Matter[];
  tasks: Task[];
  contacts: Contact[];
  inbox: InboxItem[];
  documents: DocumentFile[];
  prebill: PrebillEntry[];
  invoices: Invoice[];
  payments: Payment[];
  timeEntries: TimeEntry[];
  review: ReviewItem[];
  alerts: Alert[];
  playbooks: Playbook[];
  integrations: Integration[];
  events: CalendarEvent[];
  expenses: Expense[];
  notes: MatterNote[];
  timekeepers: Timekeeper[];
  trustLedgers: Record<string, TrustLedgerEntry[]>;
  trustRecent: { date: string; description: string; amountCents: number | null }[];
  settings: WorkspaceSettings;
  /** Extra minutes billed this session (bill-from-review, capture). */
  billedExtraMinutes: number;
}

const clone = <T>(v: T): T => structuredClone(v);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const identity = (v: unknown): string | undefined =>
  record(v) && (typeof v.id === 'string' || typeof v.name === 'string')
    ? String(v.id ?? v.name)
    : undefined;

/** Revert only this transaction's changes; reject conflicts before changing any state. */
function revert(before: unknown, after: unknown, current: unknown): unknown {
  if (equal(before, after)) return current;
  if (equal(after, current)) return clone(before);
  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    Array.isArray(current) &&
    [...before, ...after, ...current].every((v) => identity(v) !== undefined)
  ) {
    const result: unknown[] = clone(current);
    const previous = new Map(before.map((v) => [identity(v), v]));
    const applied = new Map(after.map((v) => [identity(v), v]));
    for (const key of new Set([...previous.keys(), ...applied.keys()])) {
      const old = previous.get(key);
      const next = applied.get(key);
      if (equal(old, next)) continue;
      const index = result.findIndex((v) => identity(v) === key);
      const restored = revert(old, next, index < 0 ? undefined : result[index]);
      if (restored === undefined) {
        if (index >= 0) result.splice(index, 1);
      } else if (index >= 0) result[index] = restored;
      else
        result.splice(
          Math.min(
            before.findIndex((v) => identity(v) === key),
            result.length,
          ),
          0,
          restored,
        );
    }
    return result;
  }
  if (record(before) && record(after) && record(current)) {
    const result = clone(current);
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (equal(before[key], after[key])) continue;
      const restored = revert(before[key], after[key], result[key]);
      if (restored === undefined) delete result[key];
      else result[key] = restored;
    }
    return result;
  }
  throw new Error('Cannot undo because this record has newer changes.');
}

let state: MockState = {
  matters: clone(fx.MATTERS),
  tasks: clone(fx.TASKS),
  contacts: clone(fx.CONTACTS),
  inbox: clone(fx.INBOX),
  documents: clone(fx.DOCUMENTS),
  prebill: clone(fx.PREBILL).map((p) => ({
    ...p,
    timeEntryId: p.id === 'p1' ? 'te1' : p.id === 'p2' ? 'te5' : undefined,
  })),
  invoices: clone([...fx.INVOICES, ...fx.EXTRA_INVOICES]),
  payments: clone(fx.PAYMENTS),
  timeEntries: clone(fx.TIME_ENTRIES),
  review: clone(fx.REVIEW_ITEMS),
  alerts: clone(fx.ALERTS),
  playbooks: clone(fx.PLAYBOOKS),
  integrations: clone(fx.INTEGRATIONS),
  events: clone(fx.EVENTS),
  expenses: [
    {
      id: 'ex1',
      matterId: 'm2',
      date: '2026-09-29',
      description: 'Court filing fee',
      amountCents: 18000,
      billable: true,
    },
    {
      id: 'ex2',
      matterId: 'm1',
      date: '2026-09-26',
      description: 'Courier · discovery documents',
      amountCents: 8840,
      billable: true,
    },
    {
      id: 'ex3',
      matterId: 'm4',
      date: '2026-09-24',
      description: 'Certified copies',
      amountCents: 5000,
      billable: true,
    },
  ],
  notes: [],
  timekeepers: clone(fx.TIMEKEEPERS),
  trustLedgers: clone(fx.TRUST_LEDGERS),
  trustRecent: clone(fx.TRUST_RECENT),
  settings: {
    firm: clone(fx.FIRM),
    planKey: 'pro',
    canceled: false,
    defaultTerms: 'Net 30',
    textToPay: true,
    autoNudge: true,
    ledes: false,
    aiEnabled: true,
    requireTwoFactor: true,
    biometric: true,
    autoLock: true,
    sso: false,
    mobileSession: true,
    reconciledAt: '2026-08-31',
    noticeSent: false,
  },
  billedExtraMinutes: 0,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const mockDb = {
  get: (): MockState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Apply atomically; undo preserves unrelated changes and rejects newer conflicting changes. */
  transact(mutate: (draft: MockState) => void): () => void {
    const before = state;
    const draft = clone(state);
    mutate(draft);
    state = draft;
    emit();
    let undone = false;
    return () => {
      if (undone) return;
      state = state === draft ? before : (revert(before, draft, state) as MockState);
      undone = true;
      emit();
    };
  },
};

/** Small artificial latency so loading states are exercised in development. */
export const latency = <T>(value: T, ms = 40): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

let counter = 100;
export const nextId = (prefix: string): string => `${prefix}${++counter}`;
