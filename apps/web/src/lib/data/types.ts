/**
 * Domain types for the staff web app.
 *
 * Conventions follow the repo rules: money is integer cents, durations are
 * integer minutes, dates are ISO strings (`YYYY-MM-DD`) and timestamps are ISO
 * date-times. Display strings are produced by `@/lib/format`, never stored.
 *
 * These mirror the API's OpenAPI shapes as far as they exist today; when
 * `@lawfirm/api-client` gains the domain endpoints these move to `@lawfirm/core`
 * Zod schemas and the mock data source is replaced by supabase-js selects.
 */
export type Id = string;
export type Cents = number;
export type IsoDate = string;
export type IsoDateTime = string;
export type Minutes = number;

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export type PracticeArea =
  'Probate' | 'Criminal defense' | 'Personal injury' | 'Corporate' | 'Family' | 'Immigration';

export interface Timekeeper {
  id: Id;
  name: string;
  /** "L. Tran" */
  short: string;
  initials: string;
  email: string;
  role: string;
  rateCents: Cents;
  /** Insurance-panel and pro-bono rates for the Settings table. */
  panelRateCents: Cents;
  proBonoRateCents: Cents;
  twoFactor: boolean;
  lastActive: string;
  isCurrentUser?: boolean;
}

export type BillingModel =
  | { kind: 'hourly'; rateCents: Cents }
  | { kind: 'flat'; feeCents: Cents | null; label: string }
  | { kind: 'contingency'; percent: number };

export interface Deadline {
  /** Short pill text: "Filing · Oct 3", "Hearing · today 9:30". */
  label: string;
  /** Sentence: "Inventory filing due Fri, Oct 3". */
  long: string;
  /** The rule and assignment behind it. */
  rule: string;
  date: IsoDate | null;
  tone: 'neutral' | 'warning' | 'danger';
}

export interface Matter {
  id: Id;
  number: string;
  title: string;
  /** Compact name used in rows and toasts: "Estate of Bennett". */
  short: string;
  clientId: Id;
  clientName: string;
  clientInitials: string;
  clientKind: 'person' | 'org';
  area: PracticeArea;
  /** "Hourly · $325", "Flat fee · earned on receipt". */
  billingLabel: string;
  billing: BillingModel;
  responsibleId: Id;
  openedAt: IsoDate;
  unbilledCents: Cents | null;
  trustCents: Cents | null;
  hoursToDate: number;
  stages: string[];
  /** 1-based index of the current stage. */
  stageIndex: number;
  deadline: Deadline | null;
  needsAttention: boolean;
  unbilledMeta: string;
  hoursMeta: string;
  collectedCents: Cents;
  collectedMeta: string;
  outstandingCents: Cents;
  aiChain: string;
}

export type TaskGroup = 'Today' | 'This week' | 'Later';

export interface Task {
  id: Id;
  title: string;
  matterId: Id;
  assignee: string;
  dueAt: IsoDate;
  tone: 'neutral' | 'warning' | 'danger';
  group: TaskGroup;
  done: boolean;
}

export type ContactRole = 'Client' | 'Opposing party' | 'Expert witness';

export interface Contact {
  id: Id;
  name: string;
  initials: string;
  kind: 'person' | 'org';
  role: ContactRole;
  /** Matter titles joined for the row: "Estate of Bennett · Alvarez". */
  matters: string;
  email: string;
  phone: string;
  conflict: string;
}

export type InboxKind = 'Lead' | 'Client' | 'Approval';

export interface InboxItem {
  id: Id;
  name: string;
  initials: string;
  avatar: 'default' | 'org' | 'accent';
  receivedAt: IsoDateTime;
  kind: InboxKind;
  tone: Tone;
  preview: string;
  meta: string;
  body: string;
  ai: boolean;
  conflictCheck: boolean;
  aiText: string;
  cta: string;
}

export interface DocumentFile {
  /** Object URL for a file selected in this preview session. */
  localUrl?: string;
  id: Id;
  matterId: Id;
  folder: string;
  name: string;
  modifiedAt: IsoDate;
  by: string;
  size: string;
  status: string;
  tone: Tone;
}

export type EventKind =
  'Court' | 'Meeting' | 'Deadline' | 'Call' | 'Deposition' | 'Consult' | 'Focus';

export interface CalendarEvent {
  id: Id;
  startsAt: IsoDateTime;
  durationMin: Minutes;
  title: string;
  sub: string;
  kind: EventKind;
  tone: 'neutral' | 'info' | 'warning' | 'danger';
  /** Deadlines carry a dot on their pill. */
  dot: boolean;
  matterId: Id;
}

export type TimeStatus = 'Billable' | 'No charge' | 'AI cleanup' | 'Tracked only' | 'Written down';

export interface TimeEntry {
  id: Id;
  date: IsoDate;
  matterId: Id | null;
  /** "Firm" for non-matter time. */
  matterLabel: string;
  timekeeper: string;
  narrative: string;
  code: string;
  minutes: Minutes;
  rateCents: Cents;
  amountCents: Cents | null;
  status: TimeStatus;
  invoiceId?: Id;
}

export interface PrebillEntry {
  id: Id;
  matterId: Id;
  date: IsoDate;
  timekeeper: string;
  narrative: string;
  code: string;
  minutes: Minutes;
  /** Set once the entry has been written down at review. */
  originalMinutes: Minutes | null;
  rateCents: Cents;
  /** Flat-fee milestone amount instead of hours × rate. */
  flatCents: Cents | null;
  /** Flat-fee matters track time without billing it. */
  tracked: boolean;
  ai: boolean;
  aiText: string | null;
  aiDismissed: boolean;
  reason: string | null;
  approved: boolean;
  noCharge: boolean;
  excluded: boolean;
  invoiceId?: Id;
  timeEntryId?: Id;
  expenseId?: Id;
}

export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'partial' | 'paid';

export interface InvoiceLine {
  date: IsoDate;
  timekeeper: string;
  description: string;
  /** null for flat-fee lines. */
  hours: number | null;
  rateCents: Cents | null;
  amountCents: Cents;
}

export interface ActivityEvent {
  actor: string;
  action: string;
  /** Preformatted for now ("Sep 13, 11:30 AM"); becomes an IsoDateTime with the API. */
  when: string;
  icon: string;
  accent: boolean;
  quote?: string;
  audioUrl?: string;
}

export interface Invoice {
  id: Id;
  number: string;
  clientName: string;
  matterId: Id;
  matterTitle: string;
  issuedAt: IsoDate;
  dueAt: IsoDate;
  terms: string;
  totalCents: Cents;
  balanceCents: Cents;
  status: InvoiceStatus;
  /** "Overdue · 46 days", "Partial · 2 of 4", "Paid Jul 18". */
  statusLabel: string;
  contact: string;
  feesCents: Cents;
  feeHoursLabel: string;
  expensesCents: Cents;
  trustAppliedCents: Cents;
  banner: {
    tone: 'danger' | 'warning' | 'outline';
    icon: string;
    title: string;
    text: string;
  } | null;
  lines: InvoiceLine[];
  activity: ActivityEvent[];
  /** Local delivery state for the H1 flows. */
  payLink: 'none' | 'opened' | 'texted';
  paymentPlan?: { installments: number; amountsCents: Cents[]; autoCharge: boolean };
}

export interface Expense {
  id: Id;
  matterId: Id;
  date: IsoDate;
  description: string;
  amountCents: Cents;
  billable: boolean;
  invoiceId?: Id;
}

export interface MatterNote {
  id: Id;
  matterId: Id;
  date: IsoDate;
  text: string;
  audioUrl?: string;
  visibleToClient: boolean;
}

export interface WorkspaceSettings {
  firm: FirmProfile;
  planKey: PlanKey;
  canceled: boolean;
  defaultTerms: string;
  textToPay: boolean;
  autoNudge: boolean;
  ledes: boolean;
  aiEnabled: boolean;
  requireTwoFactor: boolean;
  biometric: boolean;
  autoLock: boolean;
  sso: boolean;
  mobileSession: boolean;
  reconciledAt: IsoDate | null;
  noticeSent: boolean;
}

export interface Payment {
  id: Id;
  date: IsoDate;
  payer: string;
  invoiceNumber: string;
  method: string;
  appliedTo: string;
  amountCents: Cents;
  status: 'Settled' | 'Applied' | 'Pending';
}

export interface TrustLedgerEntry {
  date: IsoDate;
  description: string;
  depositCents: Cents | null;
  disbursementCents: Cents | null;
  balanceCents: Cents;
}

export interface ReviewItem {
  id: Id;
  icon: 'phone' | 'calendar' | 'mic';
  title: string;
  sub: string;
  hours: number;
  matterId: Id;
}

export interface Alert {
  id: Id;
  icon: string;
  tone: 'info' | 'danger' | 'accent';
  title: string;
  sub: string;
  href: string;
}

export type ReportKey = 'Utilization' | 'Realization' | 'Collection';

export interface ReportView {
  key: ReportKey;
  kpis: {
    label: string;
    value: string;
    delta: string;
    trend: 'up' | 'down' | 'flat';
    tint: boolean;
  }[];
  chartTitle: string;
  chartValue: string;
  goalPct: number;
  goalLabel: string;
  bars: { x: string; label: string; pct: number }[];
  columns: [string, string, string];
  rows: {
    name: string;
    initials: string;
    c1: string;
    c2: string;
    c3: string;
    bench: string;
    tone: Tone;
  }[];
  insight: string;
}

export interface Playbook {
  name: PracticeArea;
  meta: string;
  matterCount: number;
  enabled: boolean;
}

export interface Integration {
  name: string;
  meta: string;
  icon: string;
  connected: boolean;
}

export type PlanKey = 'core' | 'pro' | 'premier';

export interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  annualCents: Cents;
  monthlyCents: Cents;
  badge: string | null;
  addsLabel: string;
  caps: { icon: string; label: string }[];
}

export interface PlanInvoice {
  date: string;
  number: string;
  description: string;
  sub: string;
  method: string;
  amountCents: Cents;
  status: 'Paid';
}

export interface FirmProfile {
  name: string;
  stateBar: string;
  address: string;
  matterNumbering: string;
  nextMatterNumber: string;
  invoicePrefix: string;
  plan: {
    name: string;
    seats: number;
    perSeatCents: Cents;
    cycle: 'annual' | 'monthly';
    renewsOn: string;
  };
}
