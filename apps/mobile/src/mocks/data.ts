/**
 * Frontend-first mock data. Shapes mirror the Drizzle schema + planned Phase 2
 * tables so hooks swap to supabase-js / api-client reads without UI changes.
 */
export interface MockMatter {
  id: string;
  number: string;
  title: string;
  clientName: string;
  practiceArea: string;
  status: 'open' | 'pending' | 'closed';
  billingType: 'hourly' | 'flat' | 'contingency';
  responsibleAttorney: string;
  openedAt: string;
  unbilledCents: number;
  nextDeadline?: { label: string; date: string };
}

export interface MockTask {
  id: string;
  title: string;
  matterId?: string;
  matterTitle?: string;
  due: string; // ISO date
  priority: 'high' | 'medium' | 'low';
  done: boolean;
}

export interface MockTimeEntry {
  id: string;
  matterId: string;
  matterTitle: string;
  description: string;
  minutes: number;
  rateCents: number;
  date: string;
  billable: boolean;
}

export interface MockInvoice {
  id: string;
  number: string;
  clientName: string;
  matterTitle: string;
  totalCents: number;
  status: 'draft' | 'sent' | 'overdue' | 'paid';
  issuedAt: string;
  dueAt: string;
}

export interface MockContact {
  id: string;
  name: string;
  type: 'person' | 'company';
  role: string;
  email: string;
  phone: string;
}

export interface MockEvent {
  id: string;
  title: string;
  matterTitle?: string;
  start: string;
  location?: string;
  kind: 'court' | 'meeting' | 'deadline';
}

export const matters: MockMatter[] = [
  {
    id: 'm1',
    number: '2026-0142',
    title: 'Alvarez v. Meridian Logistics',
    clientName: 'Sofia Alvarez',
    practiceArea: 'Personal Injury',
    status: 'open',
    billingType: 'contingency',
    responsibleAttorney: 'D. Okafor',
    openedAt: '2026-03-12',
    unbilledCents: 0,
    nextDeadline: { label: 'Discovery cutoff', date: '2026-09-04' },
  },
  {
    id: 'm2',
    number: '2026-0187',
    title: 'Estate of Harold Bennett',
    clientName: 'Margaret Bennett',
    practiceArea: 'Probate',
    status: 'open',
    billingType: 'hourly',
    responsibleAttorney: 'L. Tran',
    openedAt: '2026-05-02',
    unbilledCents: 482500,
    nextDeadline: { label: 'Inventory filing', date: '2026-08-29' },
  },
  {
    id: 'm3',
    number: '2026-0201',
    title: 'Kessler Holdings — Series B',
    clientName: 'Kessler Holdings LLC',
    practiceArea: 'Corporate',
    status: 'open',
    billingType: 'flat',
    responsibleAttorney: 'D. Okafor',
    openedAt: '2026-06-18',
    unbilledCents: 1250000,
  },
  {
    id: 'm4',
    number: '2026-0119',
    title: 'People v. Marcus Webb',
    clientName: 'Marcus Webb',
    practiceArea: 'Criminal Defense',
    status: 'pending',
    billingType: 'flat',
    responsibleAttorney: 'J. Whitfield',
    openedAt: '2026-02-25',
    unbilledCents: 300000,
    nextDeadline: { label: 'Pretrial conference', date: '2026-08-26' },
  },
  {
    id: 'm5',
    number: '2025-0388',
    title: 'Nguyen v. Cascade Property Mgmt',
    clientName: 'Thanh Nguyen',
    practiceArea: 'Landlord/Tenant',
    status: 'closed',
    billingType: 'hourly',
    responsibleAttorney: 'L. Tran',
    openedAt: '2025-11-03',
    unbilledCents: 0,
  },
];

export const tasks: MockTask[] = [
  {
    id: 't1',
    title: 'Draft motion to compel discovery',
    matterId: 'm1',
    matterTitle: 'Alvarez v. Meridian',
    due: '2026-08-21',
    priority: 'high',
    done: false,
  },
  {
    id: 't2',
    title: 'File estate inventory with probate court',
    matterId: 'm2',
    matterTitle: 'Estate of Bennett',
    due: '2026-08-22',
    priority: 'high',
    done: false,
  },
  {
    id: 't3',
    title: 'Review Series B term sheet redlines',
    matterId: 'm3',
    matterTitle: 'Kessler — Series B',
    due: '2026-08-23',
    priority: 'medium',
    done: false,
  },
  {
    id: 't4',
    title: 'Client intake call — referral from Dr. Patel',
    due: '2026-08-25',
    priority: 'medium',
    done: false,
  },
  {
    id: 't5',
    title: 'Prep witness outline for pretrial',
    matterId: 'm4',
    matterTitle: 'People v. Webb',
    due: '2026-08-26',
    priority: 'high',
    done: false,
  },
  {
    id: 't6',
    title: 'Send engagement letter to Kessler',
    matterId: 'm3',
    matterTitle: 'Kessler — Series B',
    due: '2026-08-20',
    priority: 'low',
    done: true,
  },
];

export const timeEntries: MockTimeEntry[] = [
  {
    id: 'te1',
    matterId: 'm2',
    matterTitle: 'Estate of Bennett',
    description: 'Draft inventory schedules',
    minutes: 96,
    rateCents: 32500,
    date: '2026-08-21',
    billable: true,
  },
  {
    id: 'te2',
    matterId: 'm1',
    matterTitle: 'Alvarez v. Meridian',
    description: 'Review medical records batch 3',
    minutes: 132,
    rateCents: 0,
    date: '2026-08-21',
    billable: false,
  },
  {
    id: 'te3',
    matterId: 'm3',
    matterTitle: 'Kessler — Series B',
    description: 'Call with opposing counsel re: warranties',
    minutes: 45,
    rateCents: 42500,
    date: '2026-08-20',
    billable: true,
  },
  {
    id: 'te4',
    matterId: 'm4',
    matterTitle: 'People v. Webb',
    description: 'Pretrial motion research',
    minutes: 150,
    rateCents: 30000,
    date: '2026-08-20',
    billable: true,
  },
];

export const invoices: MockInvoice[] = [
  {
    id: 'i1',
    number: 'INV-2026-078',
    clientName: 'Margaret Bennett',
    matterTitle: 'Estate of Bennett',
    totalCents: 812500,
    status: 'overdue',
    issuedAt: '2026-07-15',
    dueAt: '2026-08-14',
  },
  {
    id: 'i2',
    number: 'INV-2026-092',
    clientName: 'Kessler Holdings LLC',
    matterTitle: 'Kessler — Series B',
    totalCents: 2500000,
    status: 'sent',
    issuedAt: '2026-08-10',
    dueAt: '2026-09-09',
  },
  {
    id: 'i3',
    number: 'INV-2026-095',
    clientName: 'Marcus Webb',
    matterTitle: 'People v. Webb',
    totalCents: 300000,
    status: 'draft',
    issuedAt: '2026-08-19',
    dueAt: '2026-09-18',
  },
  {
    id: 'i4',
    number: 'INV-2026-061',
    clientName: 'Thanh Nguyen',
    matterTitle: 'Nguyen v. Cascade',
    totalCents: 445000,
    status: 'paid',
    issuedAt: '2026-06-20',
    dueAt: '2026-07-20',
  },
];

export const contacts: MockContact[] = [
  {
    id: 'c1',
    name: 'Sofia Alvarez',
    type: 'person',
    role: 'Client',
    email: 'sofia.alvarez@mail.com',
    phone: '(415) 555-0132',
  },
  {
    id: 'c2',
    name: 'Margaret Bennett',
    type: 'person',
    role: 'Client / Executor',
    email: 'mbennett@mail.com',
    phone: '(415) 555-0177',
  },
  {
    id: 'c3',
    name: 'Kessler Holdings LLC',
    type: 'company',
    role: 'Client',
    email: 'legal@kesslerholdings.com',
    phone: '(628) 555-0200',
  },
  {
    id: 'c4',
    name: 'Meridian Logistics Inc.',
    type: 'company',
    role: 'Opposing party',
    email: 'counsel@meridianlog.com',
    phone: '(510) 555-0166',
  },
  {
    id: 'c5',
    name: 'Dr. Anand Patel',
    type: 'person',
    role: 'Expert witness',
    email: 'apatel@sfmedexperts.com',
    phone: '(415) 555-0191',
  },
];

export const events: MockEvent[] = [
  {
    id: 'e1',
    title: 'Pretrial conference',
    matterTitle: 'People v. Webb',
    start: '2026-08-26T09:30:00',
    location: 'Dept. 22, SF Superior',
    kind: 'court',
  },
  {
    id: 'e2',
    title: 'Inventory filing deadline',
    matterTitle: 'Estate of Bennett',
    start: '2026-08-29T17:00:00',
    kind: 'deadline',
  },
  {
    id: 'e3',
    title: 'Kessler board sync',
    matterTitle: 'Kessler — Series B',
    start: '2026-08-22T14:00:00',
    location: 'Zoom',
    kind: 'meeting',
  },
  {
    id: 'e4',
    title: 'Discovery cutoff',
    matterTitle: 'Alvarez v. Meridian',
    start: '2026-09-04T17:00:00',
    kind: 'deadline',
  },
];
