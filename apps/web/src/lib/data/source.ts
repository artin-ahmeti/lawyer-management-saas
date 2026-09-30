import { todayIso } from '@/lib/clock';
import { initialsOf, money, roundedHours } from '@/lib/format';
import * as fx from './fixtures';
import { latency, mockDb, nextId } from './store';
import type {
  ActivityEvent,
  Alert,
  CalendarEvent,
  Contact,
  DocumentFile,
  InboxItem,
  Integration,
  Invoice,
  Matter,
  Payment,
  Playbook,
  PrebillEntry,
  ReportView,
  ReviewItem,
  Task,
  TimeEntry,
  Timekeeper,
  TrustLedgerEntry,
  Expense,
  MatterNote,
  WorkspaceSettings,
  PlanKey,
} from './types';

/**
 * Read side. Each function maps 1:1 to a future supabase-js select (RLS) or an
 * API GET; the hooks in `queries.ts` only know these signatures.
 */
export const reads = {
  matters: (): Promise<Matter[]> => latency(mockDb.get().matters),
  matter: (id: string): Promise<Matter | null> =>
    latency(mockDb.get().matters.find((m) => m.id === id) ?? null),
  tasks: (): Promise<Task[]> => latency(mockDb.get().tasks),
  contacts: (): Promise<Contact[]> => latency(mockDb.get().contacts),
  inbox: (): Promise<InboxItem[]> => latency(mockDb.get().inbox),
  documents: (): Promise<DocumentFile[]> => latency(mockDb.get().documents),
  events: (): Promise<CalendarEvent[]> => latency(mockDb.get().events),
  deadlines: (): Promise<fx.DeadlineItem[]> => latency(fx.DEADLINES),
  timeEntries: (): Promise<TimeEntry[]> => latency(mockDb.get().timeEntries),
  prebill: (): Promise<PrebillEntry[]> => latency(mockDb.get().prebill),
  invoices: (): Promise<Invoice[]> => latency(mockDb.get().invoices),
  invoice: (id: string): Promise<Invoice | null> =>
    latency(mockDb.get().invoices.find((i) => i.id === id) ?? null),
  payments: (): Promise<Payment[]> => latency(mockDb.get().payments),
  trustLedger: (matterId: string): Promise<TrustLedgerEntry[]> =>
    latency(mockDb.get().trustLedgers[matterId] ?? []),
  trustRecent: () => latency(mockDb.get().trustRecent),
  matterActivity: (matterId: string): Promise<ActivityEvent[]> => {
    const curated = fx.MATTER_ACTIVITY[matterId];
    const derived = mockDb
      .get()
      .timeEntries.filter((t) => t.matterId === matterId)
      .map<ActivityEvent>((t) => ({
        actor: t.timekeeper,
        action: `logged ${(t.minutes / 60).toFixed(1)}h · ${t.narrative}`,
        when: t.date,
        icon: 'clock',
        accent: true,
      }));
    const notes = mockDb
      .get()
      .notes.filter((n) => n.matterId === matterId)
      .map((n) => ({
        actor: 'Dana Okafor',
        action: `added ${n.audioUrl ? 'a voice memo' : 'a note'} · ${n.text}`,
        when: n.date,
        icon: n.audioUrl ? 'mic' : 'pen',
        audioUrl: n.audioUrl,
        accent: false,
      }));
    return latency([...notes, ...derived, ...(curated ?? [])]);
  },
  review: (): Promise<ReviewItem[]> => latency(mockDb.get().review),
  alerts: (): Promise<Alert[]> => latency(mockDb.get().alerts),
  reports: (): Promise<ReportView[]> => latency(fx.REPORTS),
  timekeepers: (): Promise<Timekeeper[]> => latency(mockDb.get().timekeepers),
  expenses: (): Promise<Expense[]> => latency(mockDb.get().expenses),
  settings: (): Promise<WorkspaceSettings> => latency(mockDb.get().settings),
  playbooks: (): Promise<Playbook[]> => latency(mockDb.get().playbooks),
  integrations: (): Promise<Integration[]> => latency(mockDb.get().integrations),
  billedExtraMinutes: (): Promise<number> => latency(mockDb.get().billedExtraMinutes),
};

export interface LogTimeInput {
  matterId: string;
  minutes: number;
  narrative: string;
  code: string;
  billable: boolean;
  rateCents: number;
  timekeeper: string;
  date?: string;
}

export interface PaymentInput {
  invoiceId: string;
  amountCents: number;
  method: 'ACH' | 'Card' | 'Check' | 'Trust';
  date: string;
  reference?: string;
}

export const prebillAmount = (p: PrebillEntry): number =>
  p.tracked || p.noCharge || p.excluded
    ? 0
    : (p.flatCents ?? Math.round((p.minutes * p.rateCents) / 60));

export function paymentInstallments(balanceCents: number, count: number): number[] {
  if (!Number.isSafeInteger(balanceCents) || balanceCents <= 0 || ![2, 3, 4, 6].includes(count)) {
    throw new Error('Choose a valid balance and installment count.');
  }
  const regular = Math.floor(balanceCents / count);
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? balanceCents - regular * (count - 1) : regular,
  );
}

function positiveCents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error('Enter an amount greater than zero.');
}

/**
 * Write side. Each function is the shape of a NestJS API call (POST/PATCH);
 * today it mutates the in-memory store and hands back an undo for the toast.
 */
export const writes = {
  toggleTask: (id: string) =>
    mockDb.transact((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) t.done = !t.done;
    }),
  billReview: (id: string) =>
    mockDb.transact((d) => {
      const r = d.review.find((x) => x.id === id);
      if (!r) return;
      d.review = d.review.filter((x) => x.id !== id);
      d.billedExtraMinutes += Math.round(r.hours * 60);
      const m = d.matters.find((x) => x.id === r.matterId);
      const amountCents = Math.round(r.hours * 42500);
      if (m) {
        m.unbilledCents = (m.unbilledCents ?? 0) + amountCents;
        m.hoursToDate += r.hours;
      }
      d.timeEntries.unshift({
        id: nextId('te'),
        date: todayIso(),
        matterId: r.matterId,
        matterLabel: m?.short ?? '',
        timekeeper: 'D. Okafor',
        narrative: r.title,
        code: r.icon === 'phone' ? 'L390' : r.icon === 'calendar' ? 'L120' : 'L110',
        minutes: Math.round(r.hours * 60),
        rateCents: 42500,
        amountCents,
        status: 'Billable',
      });
      const entry = d.timeEntries[0]!;
      d.prebill.unshift({
        id: nextId('pb'),
        timeEntryId: entry.id,
        matterId: r.matterId,
        date: entry.date,
        timekeeper: entry.timekeeper,
        narrative: entry.narrative,
        code: entry.code,
        minutes: entry.minutes,
        rateCents: entry.rateCents,
        flatCents: null,
        originalMinutes: null,
        tracked: false,
        ai: false,
        aiText: null,
        aiDismissed: false,
        reason: null,
        approved: false,
        noCharge: false,
        excluded: false,
      });
    }),
  skipReview: (id: string) =>
    mockDb.transact((d) => {
      d.review = d.review.filter((x) => x.id !== id);
    }),
  billAllReview: () =>
    mockDb.transact((d) => {
      for (const r of d.review) {
        const m = d.matters.find((x) => x.id === r.matterId);
        const amountCents = Math.round(r.hours * 42500);
        d.timeEntries.unshift({
          id: nextId('te'),
          date: todayIso(),
          matterId: r.matterId,
          matterLabel: m?.short ?? '',
          timekeeper: 'D. Okafor',
          narrative: r.title,
          code: r.icon === 'phone' ? 'L390' : r.icon === 'calendar' ? 'L120' : 'L110',
          minutes: Math.round(r.hours * 60),
          rateCents: 42500,
          amountCents,
          status: 'Billable',
        });
        const entry = d.timeEntries[0]!;
        d.prebill.unshift({
          id: nextId('pb'),
          timeEntryId: entry.id,
          matterId: r.matterId,
          date: entry.date,
          timekeeper: entry.timekeeper,
          narrative: entry.narrative,
          code: entry.code,
          minutes: entry.minutes,
          rateCents: entry.rateCents,
          flatCents: null,
          originalMinutes: null,
          tracked: false,
          ai: false,
          aiText: null,
          aiDismissed: false,
          reason: null,
          approved: false,
          noCharge: false,
          excluded: false,
        });
        if (m) {
          m.unbilledCents = (m.unbilledCents ?? 0) + amountCents;
          m.hoursToDate += r.hours;
        }
      }
      d.billedExtraMinutes += d.review.reduce((a, r) => a + Math.round(r.hours * 60), 0);
      d.review = [];
    }),
  logTime: (input: LogTimeInput) =>
    mockDb.transact((d) => {
      const m = d.matters.find((x) => x.id === input.matterId);
      if (
        !m ||
        !input.narrative.trim() ||
        !Number.isSafeInteger(input.minutes) ||
        input.minutes <= 0 ||
        !Number.isSafeInteger(input.rateCents) ||
        input.rateCents < 0
      ) {
        throw new Error('Choose a matter and enter a narrative and positive duration.');
      }
      const minutes = Math.round(roundedHours(input.minutes) * 60);
      const amountCents = input.billable ? Math.round((minutes * input.rateCents) / 60) : null;
      d.timeEntries.unshift({
        id: nextId('te'),
        date: input.date ?? todayIso(),
        matterId: input.matterId,
        matterLabel: m?.short ?? '',
        timekeeper: input.timekeeper,
        narrative: input.narrative,
        code: input.code,
        minutes,
        rateCents: input.rateCents,
        amountCents,
        status: input.billable ? 'Billable' : 'No charge',
      });
      m.hoursToDate += minutes / 60;
      if (input.billable) {
        d.billedExtraMinutes += minutes;
        m.unbilledCents = (m.unbilledCents ?? 0) + (amountCents ?? 0);
        d.prebill.unshift({
          id: nextId('pb'),
          timeEntryId: d.timeEntries[0]!.id,
          matterId: m.id,
          date: input.date ?? todayIso(),
          timekeeper: input.timekeeper,
          narrative: input.narrative.trim(),
          code: input.code,
          minutes,
          rateCents: input.rateCents,
          flatCents: null,
          originalMinutes: null,
          tracked: false,
          ai: false,
          aiText: null,
          aiDismissed: false,
          reason: null,
          approved: false,
          noCharge: false,
          excluded: false,
        });
      }
    }),
  patchPrebill: (id: string, patch: Partial<PrebillEntry>) =>
    mockDb.transact((d) => {
      const p = d.prebill.find((x) => x.id === id);
      if (!p || p.invoiceId) throw new Error('This entry is no longer available for review.');
      const before = prebillAmount(p);
      Object.assign(p, patch);
      if (
        !p.narrative.trim() ||
        !Number.isSafeInteger(p.minutes) ||
        p.minutes < 0 ||
        !Number.isSafeInteger(p.rateCents) ||
        p.rateCents < 0
      )
        throw new Error('Enter a narrative, valid duration and rate.');
      const m = d.matters.find((m) => m.id === p.matterId);
      if (m) m.unbilledCents = Math.max(0, (m.unbilledCents ?? 0) + prebillAmount(p) - before);
      const time = d.timeEntries.find((t) => t.id === p.timeEntryId);
      if (time) {
        time.narrative = p.narrative;
        time.amountCents = prebillAmount(p);
        time.status = p.noCharge ? 'No charge' : 'Billable';
      }
    }),
  adjustPrebillMinutes: (id: string, deltaMinutes: number) =>
    mockDb.transact((d) => {
      const p = d.prebill.find((x) => x.id === id);
      if (!p || p.flatCents !== null || p.invoiceId) return;
      if (!Number.isSafeInteger(deltaMinutes) || deltaMinutes % 6 !== 0)
        throw new Error('Adjust duration in six-minute increments.');
      const before = prebillAmount(p);
      const next = Math.max(6, p.minutes + deltaMinutes);
      if (next === p.minutes) return;
      p.originalMinutes ??= p.minutes;
      p.minutes = next;
      p.reason ??= 'Adjusted at review';
      const m = d.matters.find((m) => m.id === p.matterId);
      if (m) m.unbilledCents = Math.max(0, (m.unbilledCents ?? 0) + prebillAmount(p) - before);
      const time = d.timeEntries.find((t) => t.id === p.timeEntryId);
      if (time) {
        time.minutes = p.minutes;
        time.amountCents = prebillAmount(p);
        time.status = 'Written down';
      }
    }),
  setInvoiceState: (id: string, next: 'texted' | 'sent') =>
    mockDb.transact((d) => {
      const inv = d.invoices.find((x) => x.id === id);
      if (!inv) return;
      if (next === 'texted') {
        if (inv.status === 'draft' || inv.balanceCents <= 0)
          throw new Error(
            'Issue an invoice with an outstanding balance before creating a payment link.',
          );
        inv.payLink = 'texted';
        inv.activity.unshift({
          actor: 'Dana Okafor',
          action: 'texted pay link',
          when: 'Today',
          icon: 'send',
          accent: true,
        });
      }
      if (next === 'sent') {
        if (inv.status !== 'draft') throw new Error('This invoice has already been issued.');
        const m = d.matters.find((m) => m.id === inv.matterId);
        if (m) m.outstandingCents += inv.balanceCents;
        inv.status = 'sent';
        inv.statusLabel = 'Sent';
        inv.activity.unshift({
          actor: 'Dana Okafor',
          action: 'sent invoice by email',
          when: 'Today',
          icon: 'send',
          accent: true,
        });
      }
    }),
  createMatter: (input: {
    title: string;
    clientId: string;
    area: Matter['area'];
    responsibleId: string;
    rateCents: number;
  }) =>
    mockDb.transact((d) => {
      const client = d.contacts.find((c) => c.id === input.clientId);
      if (!client || !input.title.trim())
        throw new Error('Choose a client and enter a matter name.');
      if (
        !d.timekeepers.some((p) => p.id === input.responsibleId) ||
        !Number.isSafeInteger(input.rateCents) ||
        input.rateCents < 0
      )
        throw new Error('Choose a responsible user and valid hourly rate.');
      const template = d.matters.find((m) => m.area === input.area) ?? d.matters[0]!;
      const number = d.settings.firm.nextMatterNumber;
      d.settings.firm.nextMatterNumber = `${number.slice(0, 5)}${String(Number(number.slice(5)) + 1).padStart(4, '0')}`;
      d.matters.unshift({
        ...structuredClone(template),
        id: nextId('m'),
        number,
        title: input.title.trim(),
        short: input.title.trim(),
        clientId: client.id,
        clientName: client.name,
        clientInitials: client.initials,
        clientKind: client.kind,
        area: input.area,
        responsibleId: input.responsibleId,
        openedAt: todayIso(),
        billing: { kind: 'hourly', rateCents: input.rateCents },
        billingLabel: `Hourly · ${money(input.rateCents)}`,
        unbilledCents: 0,
        trustCents: 0,
        hoursToDate: 0,
        stageIndex: 1,
        deadline: null,
        needsAttention: false,
        unbilledMeta: 'No unbilled entries',
        hoursMeta: 'No time logged',
        collectedCents: 0,
        collectedMeta: 'No payments yet',
        outstandingCents: 0,
        aiChain: '',
      });
    }),
  createContact: (input: Omit<Contact, 'id' | 'initials' | 'conflict' | 'matters'>) =>
    mockDb.transact((d) => {
      if (!input.name.trim()) throw new Error('Enter a contact name.');
      d.contacts.unshift({
        ...input,
        name: input.name.trim(),
        id: nextId('c'),
        initials: initialsOf(input.name),
        conflict: 'Not checked',
        matters: '',
      });
    }),
  createTask: (input: Omit<Task, 'id' | 'tone' | 'group' | 'done'>) =>
    mockDb.transact((d) => {
      if (!input.title.trim() || !d.matters.some((m) => m.id === input.matterId))
        throw new Error('Choose a matter and enter a task.');
      d.tasks.unshift({
        ...input,
        title: input.title.trim(),
        id: nextId('t'),
        tone: input.dueAt <= todayIso() ? 'warning' : 'neutral',
        group: input.dueAt <= todayIso() ? 'Today' : 'This week',
        done: false,
      });
    }),
  createEvent: (input: Omit<CalendarEvent, 'id'>) =>
    mockDb.transact((d) => {
      if (
        !input.title.trim() ||
        !Number.isFinite(Date.parse(input.startsAt)) ||
        !d.matters.some((m) => m.id === input.matterId) ||
        !Number.isSafeInteger(input.durationMin) ||
        input.durationMin < 5 ||
        input.durationMin > 1440
      )
        throw new Error('Choose a matter and enter a title, valid date and duration.');
      d.events.push({ ...input, id: nextId('ev') });
    }),
  createExpense: (input: Omit<Expense, 'id'>) =>
    mockDb.transact((d) => {
      positiveCents(input.amountCents);
      if (!input.description.trim() || !d.matters.some((m) => m.id === input.matterId))
        throw new Error('Choose a matter and enter an expense description.');
      const expenseId = nextId('ex');
      d.expenses.unshift({ ...input, id: expenseId });
      if (input.billable) {
        const m = d.matters.find((m) => m.id === input.matterId)!;
        m.unbilledCents = (m.unbilledCents ?? 0) + input.amountCents;
        d.prebill.unshift({
          id: nextId('pb'),
          expenseId,
          matterId: input.matterId,
          date: input.date,
          timekeeper: fx.CURRENT_USER.short,
          narrative: input.description.trim(),
          code: 'E101',
          minutes: 0,
          originalMinutes: null,
          rateCents: 0,
          flatCents: input.amountCents,
          tracked: false,
          ai: false,
          aiText: null,
          aiDismissed: false,
          reason: null,
          approved: false,
          noCharge: false,
          excluded: false,
        });
      }
    }),
  createNote: (input: Omit<MatterNote, 'id'>) =>
    mockDb.transact((d) => {
      if (
        (!input.text.trim() && !input.audioUrl) ||
        !d.matters.some((m) => m.id === input.matterId)
      )
        throw new Error('Choose a matter and enter a note or record a memo.');
      d.notes.unshift({ ...input, text: input.text.trim() || 'Voice memo', id: nextId('note') });
    }),
  uploadDocuments: (
    matterId: string,
    folder: string,
    files: { name: string; size: string; localUrl?: string }[],
  ) =>
    mockDb.transact((d) => {
      if (!d.matters.some((m) => m.id === matterId)) throw new Error('Choose a matter first.');
      d.documents.unshift(
        ...files.map((f) => ({
          ...f,
          id: nextId('doc'),
          matterId,
          folder,
          modifiedAt: todayIso(),
          by: 'D. Okafor',
          status: 'Uploaded',
          tone: 'neutral' as const,
        })),
      );
    }),
  markFiled: (matterId: string) =>
    mockDb.transact((d) => {
      const m = d.matters.find((x) => x.id === matterId);
      if (m) {
        m.deadline = null;
        m.needsAttention = false;
      }
    }),
  generateInvoices: (matterId?: string) =>
    mockDb.transact((d) => {
      const candidates = d.prebill.filter(
        (p) =>
          !p.invoiceId &&
          p.approved &&
          prebillAmount(p) > 0 &&
          (!matterId || p.matterId === matterId),
      );
      for (const mid of new Set(candidates.map((p) => p.matterId))) {
        const m = d.matters.find((x) => x.id === mid)!;
        const entries = candidates.filter((p) => p.matterId === mid);
        const totalCents = entries.reduce((s, p) => s + prebillAmount(p), 0);
        const id = nextId('i');
        const serial =
          Math.max(...d.invoices.map((i) => Number(i.number.split('-').at(-1)) || 0)) + 1;
        const number = `INV-2026-${String(serial).padStart(3, '0')}`;
        const client = d.contacts.find((c) => c.id === m.clientId);
        const expensesCents = entries
          .filter((p) => p.expenseId)
          .reduce((sum, p) => sum + prebillAmount(p), 0);
        const terms = d.settings.defaultTerms;
        const due = new Date(`${todayIso()}T12:00:00Z`);
        due.setUTCDate(due.getUTCDate() + (Number(terms.match(/\d+/)?.[0]) || 0));
        d.invoices.unshift({
          id,
          number,
          clientName: m.clientName,
          matterId: mid,
          matterTitle: m.title,
          issuedAt: todayIso(),
          dueAt: due.toISOString().slice(0, 10),
          terms,
          totalCents,
          balanceCents: totalCents,
          status: 'draft',
          statusLabel: 'Draft',
          contact: client?.email ?? '',
          feesCents: totalCents - expensesCents,
          feeHoursLabel: '',
          expensesCents,
          trustAppliedCents: 0,
          banner: null,
          lines: entries.map((p) => ({
            date: p.date,
            timekeeper: p.timekeeper,
            description: p.narrative,
            hours: p.flatCents === null ? p.minutes / 60 : null,
            rateCents: p.flatCents === null ? p.rateCents : null,
            amountCents: prebillAmount(p),
          })),
          activity: [
            {
              actor: 'Dana Okafor',
              action: 'generated draft invoice',
              when: 'Today',
              icon: 'receipt',
              accent: true,
            },
          ],
          payLink: 'none',
        });
        for (const p of entries) {
          p.invoiceId = id;
          const time = d.timeEntries.find((t) => t.id === p.timeEntryId);
          if (time) time.invoiceId = id;
          const expense = d.expenses.find((e) => e.id === p.expenseId);
          if (expense) expense.invoiceId = id;
        }
        m.unbilledCents = Math.max(0, (m.unbilledCents ?? 0) - totalCents);
      }
      // Payment plans: the next due installment of a partially paid plan becomes its own draft.
      for (const plan of d.invoices.filter(
        (i) =>
          i.status === 'partial' && /plan/i.test(i.terms) && (!matterId || i.matterId === matterId),
      )) {
        const parts = /(\d+)\s*of\s*(\d+)/.exec(plan.statusLabel);
        const paid = parts ? Number(parts[1]) : 1;
        const total = parts ? Number(parts[2]) : 4;
        if (paid >= total) continue;
        const amount = Math.round(plan.balanceCents / (total - paid));
        const already = d.invoices.some((i) => i.number === `${plan.number}-${paid + 1}`);
        if (already) continue;
        d.invoices.unshift({
          ...structuredClone(plan),
          id: nextId('i'),
          number: `${plan.number}-${paid + 1}`,
          issuedAt: todayIso(),
          totalCents: amount,
          balanceCents: amount,
          status: 'draft',
          statusLabel: `Draft · plan ${paid + 1} of ${total}`,
          terms: `Payment plan · ${paid + 1} of ${total}`,
          banner: null,
          lines: [
            {
              date: todayIso(),
              timekeeper: 'System',
              description: `Payment plan installment ${paid + 1} of ${total}`,
              hours: null,
              rateCents: null,
              amountCents: amount,
            },
          ],
          activity: [
            {
              actor: 'System',
              action: `scheduled installment ${paid + 1} of ${total}`,
              when: 'Today',
              icon: 'receipt',
              accent: false,
            },
          ],
          payLink: 'none',
        });
      }
    }),
  approvePrebill: (matterId?: string) =>
    mockDb.transact((d) => {
      d.prebill
        .filter((p) => !p.invoiceId && (!matterId || p.matterId === matterId))
        .forEach((p) => {
          p.approved = true;
        });
    }),
  recordPayment: (input: PaymentInput) =>
    mockDb.transact((d) => {
      positiveCents(input.amountCents);
      const inv = d.invoices.find((i) => i.id === input.invoiceId);
      if (!inv || inv.status === 'draft' || input.amountCents > inv.balanceCents)
        throw new Error('Payment must not exceed an issued invoice’s balance.');
      const m = d.matters.find((x) => x.id === inv.matterId)!;
      if (input.method === 'Trust') {
        if (input.amountCents > (m.trustCents ?? 0))
          throw new Error('Insufficient funds in this client’s trust ledger.');
        m.trustCents = (m.trustCents ?? 0) - input.amountCents;
        inv.trustAppliedCents += input.amountCents;
        (d.trustLedgers[m.id] ??= []).unshift({
          date: input.date,
          description: `Applied to ${inv.number}`,
          depositCents: null,
          disbursementCents: input.amountCents,
          balanceCents: m.trustCents,
        });
        d.trustRecent.unshift({
          date: input.date,
          description: `Applied to ${inv.number} · ${m.short}`,
          amountCents: -input.amountCents,
        });
      }
      inv.balanceCents -= input.amountCents;
      inv.status = inv.balanceCents === 0 ? 'paid' : 'partial';
      inv.statusLabel = inv.balanceCents === 0 ? 'Paid today' : 'Partial';
      if (inv.balanceCents === 0) inv.banner = null;
      m.outstandingCents = Math.max(0, m.outstandingCents - input.amountCents);
      m.collectedCents += input.amountCents;
      d.payments.unshift({
        id: nextId('pay'),
        date: input.date,
        payer: inv.clientName,
        invoiceNumber: inv.number,
        method: input.method,
        appliedTo: inv.matterTitle,
        amountCents: input.amountCents,
        status: input.method === 'Trust' ? 'Applied' : 'Settled',
      });
      inv.activity.unshift({
        actor: inv.clientName,
        action: `paid ${money(input.amountCents)} by ${input.method}${input.reference ? ` · ${input.reference}` : ''}`,
        when: input.date,
        icon: 'dollar',
        accent: true,
      });
    }),
  setPaymentPlan: (invoiceId: string, count: number, autoCharge: boolean) =>
    mockDb.transact((d) => {
      const inv = d.invoices.find((i) => i.id === invoiceId);
      if (!inv || inv.balanceCents <= 0 || inv.status === 'draft')
        throw new Error('Choose an issued invoice with an outstanding balance.');
      inv.paymentPlan = {
        installments: count,
        amountsCents: paymentInstallments(inv.balanceCents, count),
        autoCharge,
      };
      inv.activity.unshift({
        actor: 'Dana Okafor',
        action: `offered a ${count}-installment payment plan`,
        when: 'Today',
        icon: 'calendar',
        accent: true,
      });
    }),
  trustTransaction: (input: {
    matterId: string;
    amountCents: number;
    description: string;
    kind: 'deposit' | 'disbursement';
  }) =>
    mockDb.transact((d) => {
      positiveCents(input.amountCents);
      const m = d.matters.find((x) => x.id === input.matterId);
      if (!m || !input.description.trim())
        throw new Error('Choose a matter and enter a description.');
      if (input.kind === 'disbursement' && input.amountCents > (m.trustCents ?? 0))
        throw new Error('Insufficient funds in this client’s trust ledger.');
      m.trustCents =
        (m.trustCents ?? 0) + (input.kind === 'deposit' ? input.amountCents : -input.amountCents);
      (d.trustLedgers[m.id] ??= []).unshift({
        date: todayIso(),
        description: input.description,
        depositCents: input.kind === 'deposit' ? input.amountCents : null,
        disbursementCents: input.kind === 'disbursement' ? input.amountCents : null,
        balanceCents: m.trustCents,
      });
      d.trustRecent.unshift({
        date: todayIso(),
        description: `${input.description} · ${m.short}`,
        amountCents: input.kind === 'deposit' ? input.amountCents : -input.amountCents,
      });
    }),
  patchSettings: (patch: Partial<WorkspaceSettings>) =>
    mockDb.transact((d) => {
      Object.assign(d.settings, patch);
    }),
  changePlan: (key: PlanKey, cycle: 'annual' | 'monthly') =>
    mockDb.transact((d) => {
      const plan = fx.PLANS.find((p) => p.key === key)!;
      d.settings.planKey = key;
      d.settings.firm.plan = {
        ...d.settings.firm.plan,
        name: plan.name,
        cycle,
        perSeatCents: cycle === 'annual' ? plan.annualCents : plan.monthlyCents,
      };
    }),
  inviteUser: (name: string, email: string) =>
    mockDb.transact((d) => {
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a name and valid email.');
      if (d.timekeepers.some((u) => u.email.toLowerCase() === email.toLowerCase()))
        throw new Error('This user already belongs to the firm.');
      d.timekeepers.push({
        id: nextId('user'),
        name,
        short: name,
        initials: initialsOf(name),
        email,
        role: 'Staff',
        rateCents: 0,
        panelRateCents: 0,
        proBonoRateCents: 0,
        twoFactor: false,
        lastActive: 'Invited',
      });
      d.settings.firm.plan.seats = d.timekeepers.length;
    }),
  markAlertsRead: () =>
    mockDb.transact((d) => {
      d.alerts = [];
    }),
  togglePlaybook: (name: string) =>
    mockDb.transact((d) => {
      const p = d.playbooks.find((x) => x.name === name);
      if (p) p.enabled = !p.enabled;
    }),
  toggleIntegration: (name: string) =>
    mockDb.transact((d) => {
      const i = d.integrations.find((x) => x.name === name);
      if (i) i.connected = !i.connected;
    }),
  removeInboxItem: (id: string) =>
    mockDb.transact((d) => {
      d.inbox = d.inbox.filter((x) => x.id !== id);
    }),
};
