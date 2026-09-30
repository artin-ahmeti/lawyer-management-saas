import { formatCents } from '@lawfirm/core';
import type { StageItem } from '@/components/ui/StageTracker';
import type { TimelineEvent } from '@/components/ui/Timeline';

export type MatterId = 'bennett' | 'alvarez' | 'kessler' | 'webb' | 'delgado' | 'okonkwo';

export interface H1Matter {
  id: MatterId;
  number: string;
  title: string;
  short: string;
  client: string;
  area: string;
  attorney: string;
  billing: string;
  status: string;
  stage: string;
  attention?: string;
  attentionTone?: 'warning' | 'danger';
  meta: string;
  unbilledCents: number;
  trustCents: number;
  hours: string;
  entries: number;
  stages: StageItem[];
  deadline?: { title: string; text: string; tone: 'warning' | 'neutral' | 'info'; action: string };
  tasks: { title: string; who: string; due: string; tone?: 'warning' | 'danger' }[];
  time: {
    duration: string;
    date: string;
    title: string;
    code: string;
    amountCents?: number;
    noCharge?: boolean;
  }[];
  invoices: string[];
  activity: TimelineEvent[];
}

export const MATTERS: Record<MatterId, H1Matter> = {
  bennett: {
    id: 'bennett',
    number: '2026-0187',
    title: 'Estate of Harold Bennett',
    short: 'Estate of Bennett',
    client: 'Margaret Bennett',
    area: 'Probate',
    attorney: 'L. Tran',
    billing: 'Hourly · $325',
    status: 'Open',
    stage: 'Inventory',
    attention: 'Filing · Oct 3',
    attentionTone: 'warning',
    meta: '$4,825.00 unbilled',
    unbilledCents: 482500,
    trustCents: 1824000,
    hours: '42.6',
    entries: 18,
    stages: [
      { label: 'Intake', state: 'done' },
      { label: 'Petition', state: 'done' },
      { label: 'Letters', state: 'done' },
      { label: 'Inventory', state: 'current' },
      { label: 'Accounting' },
      { label: 'Close' },
    ],
    deadline: {
      title: 'Inventory filing due Fri, Oct 3',
      text: 'Prob. Code §8800 · 4 days · draft is ready to review',
      tone: 'warning',
      action: 'Mark filed',
    },
    tasks: [
      {
        title: 'File estate inventory with probate court',
        who: 'L. Tran',
        due: 'Oct 3',
        tone: 'warning',
      },
      { title: 'Confirm appraiser invoice for disbursement', who: 'D. Okafor', due: 'Oct 7' },
    ],
    time: [
      {
        duration: '1:36',
        date: 'Sep 29',
        title: 'Draft inventory schedules',
        code: 'L110',
        amountCents: 52000,
      },
      {
        duration: '0:48',
        date: 'Sep 26',
        title: 'Review appraiser report',
        code: 'L110',
        amountCents: 26000,
      },
    ],
    invoices: ['078'],
    activity: [
      { icon: 'file', title: 'Inventory Schedule A added to Court filings', meta: 'Today 8:42 AM' },
      {
        icon: 'message',
        title: 'Margaret Bennett asked for the appraiser’s summary',
        meta: 'Yesterday 4:20 PM',
        quote: 'Could you send me the summary before Friday?',
      },
    ],
  },
  alvarez: {
    id: 'alvarez',
    number: '2026-0142',
    title: 'Alvarez v. Meridian Logistics',
    short: 'Alvarez v. Meridian',
    client: 'Sofia Alvarez',
    area: 'Personal injury',
    attorney: 'D. Okafor',
    billing: 'Contingency · 33%',
    status: 'Open',
    stage: 'Discovery',
    meta: 'Cutoff Oct 24',
    unbilledCents: 0,
    trustCents: 0,
    hours: '61.2',
    entries: 27,
    stages: [
      { label: 'Intake', state: 'done' },
      { label: 'Investigation', state: 'done' },
      { label: 'Discovery', state: 'current' },
      { label: 'Mediation' },
      { label: 'Trial' },
      { label: 'Resolution' },
    ],
    deadline: {
      title: 'Discovery cutoff Fri, Oct 24',
      text: 'CCP §2024.020 · 25 days · expert disclosure follows Nov 14',
      tone: 'neutral',
      action: 'Mark complete',
    },
    tasks: [
      { title: 'Draft motion to compel discovery', who: 'D. Okafor', due: 'Oct 10' },
      { title: 'Schedule IME with Dr. Patel', who: 'D. Okafor', due: 'Oct 3', tone: 'warning' },
    ],
    time: [
      {
        duration: '2:12',
        date: 'Sep 29',
        title: 'Review medical records batch 3',
        code: 'L310',
        noCharge: true,
      },
      {
        duration: '0:12',
        date: 'Sep 29',
        title: 'Call with client re: IME',
        code: 'L120',
        noCharge: true,
      },
    ],
    invoices: [],
    activity: [
      {
        icon: 'phone',
        title: 'Call with Sofia Alvarez · 12 min · unbilled',
        meta: 'Today 10:12 AM',
      },
    ],
  },
  kessler: {
    id: 'kessler',
    number: '2026-0201',
    title: 'Kessler Holdings — Series B',
    short: 'Kessler',
    client: 'Kessler Holdings LLC',
    area: 'Corporate',
    attorney: 'D. Okafor',
    billing: 'Flat fee · $37,500',
    status: 'Open',
    stage: 'Diligence',
    meta: '$12,500.00 unbilled',
    unbilledCents: 1250000,
    trustCents: 0,
    hours: '38.4',
    entries: 14,
    stages: [
      { label: 'Engagement', state: 'done' },
      { label: 'Diligence', state: 'current' },
      { label: 'Closing' },
    ],
    tasks: [
      {
        title: 'Review Series B term sheet redlines',
        who: 'D. Okafor',
        due: 'Oct 2',
        tone: 'warning',
      },
    ],
    time: [
      {
        duration: '0:45',
        date: 'Sep 26',
        title: 'Call with opposing counsel re: warranties',
        code: 'L120',
        amountCents: 31875,
      },
    ],
    invoices: ['092'],
    activity: [
      { icon: 'receipt', title: 'INV-2026-092 sent · $25,000.00 · due Oct 9', meta: 'Sep 9' },
    ],
  },
  webb: {
    id: 'webb',
    number: '2026-0119',
    title: 'People v. Marcus Webb',
    short: 'People v. Webb',
    client: 'Marcus Webb',
    area: 'Criminal defense',
    attorney: 'J. Whitfield',
    billing: 'Flat fee · earned on receipt',
    status: 'Pending',
    stage: 'Pretrial',
    attention: 'Hearing 9:30',
    attentionTone: 'danger',
    meta: 'Pretrial',
    unbilledCents: 300000,
    trustCents: 0,
    hours: '22.5',
    entries: 9,
    stages: [
      { label: 'Arraignment', state: 'done' },
      { label: 'Pretrial', state: 'current' },
      { label: 'Motions' },
      { label: 'Trial' },
      { label: 'Disposition' },
    ],
    deadline: {
      title: 'Pretrial conference today · 9:30 AM',
      text: 'SF Superior · Dept. 22 · Hon. R. Castellanos',
      tone: 'info',
      action: 'Quick note',
    },
    tasks: [
      {
        title: 'Prep witness outline for pretrial',
        who: 'J. Whitfield',
        due: 'Today',
        tone: 'danger',
      },
    ],
    time: [
      {
        duration: '2:30',
        date: 'Sep 26',
        title: 'Pretrial motion research',
        code: 'L230',
        amountCents: 75000,
      },
    ],
    invoices: ['095'],
    activity: [
      {
        icon: 'gavel',
        title: 'Pretrial conference set · Sep 29, 9:30 AM · Dept. 22',
        meta: 'Sep 2 · from court notice',
      },
    ],
  },
  delgado: {
    id: 'delgado',
    number: '2026-0210',
    title: 'In re Marriage of Delgado',
    short: 'Delgado',
    client: 'Elena Delgado',
    area: 'Family',
    attorney: 'L. Tran',
    billing: 'Flat fee · plan 2 of 4',
    status: 'Open',
    stage: 'Disclosures',
    meta: 'Plan 2 of 4',
    unbilledCents: 0,
    trustCents: 325000,
    hours: '11.0',
    entries: 6,
    stages: [
      { label: 'Petition', state: 'done' },
      { label: 'Disclosures', state: 'current' },
      { label: 'Settlement' },
      { label: 'Judgment' },
    ],
    tasks: [{ title: 'Serve preliminary disclosures', who: 'L. Tran', due: 'Oct 8' }],
    time: [],
    invoices: ['094'],
    activity: [],
  },
  okonkwo: {
    id: 'okonkwo',
    number: '2026-0214',
    title: 'Okonkwo I-130 petition',
    short: 'Okonkwo',
    client: 'Chidi Okonkwo',
    area: 'Immigration',
    attorney: 'D. Okafor',
    billing: 'Flat fee · $4,000',
    status: 'Open',
    stage: 'Filed',
    meta: 'RFE window Oct 11',
    unbilledCents: 0,
    trustCents: 1151000,
    hours: '9.8',
    entries: 5,
    stages: [
      { label: 'Intake', state: 'done' },
      { label: 'Filed', state: 'current' },
      { label: 'RFE' },
      { label: 'Approval' },
    ],
    deadline: {
      title: 'RFE response window closes Sat, Oct 11',
      text: 'USCIS receipt Aug 12 · 12 days',
      tone: 'neutral',
      action: 'Mark responded',
    },
    tasks: [{ title: 'Gather RFE evidence · joint lease, photos', who: 'D. Okafor', due: 'Oct 9' }],
    time: [],
    invoices: [],
    activity: [],
  },
};

export const isMatterId = (id: string | null | undefined): id is MatterId =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(MATTERS, id);

/** The prototype opens with this timer already running (Today → timer bar → Stop → Bill). */
export const DEMO_TIMER = {
  matterId: 'bennett' as MatterId,
  activity: 'Draft inventory schedules',
  elapsedSeconds: 42 * 60 + 17,
};

export const MATTER_ORDER: MatterId[] = [
  'bennett',
  'webb',
  'alvarez',
  'kessler',
  'delgado',
  'okonkwo',
];

export interface H1Invoice {
  id: string;
  number: string;
  client: string;
  matter: string;
  totalCents: number;
  status: 'overdue' | 'sent' | 'draft' | 'partial' | 'paid';
  statusLabel: string;
  lines?: { title: string; detail: string; cents: number }[];
}

export const INVOICES: H1Invoice[] = [
  {
    id: '078',
    number: 'INV-2026-078',
    client: 'Margaret Bennett',
    matter: 'Estate of Harold Bennett',
    totalCents: 812500,
    status: 'overdue',
    statusLabel: 'Overdue 46d',
    lines: [
      { title: 'Draft petition and schedules', detail: 'L. Tran · 9.5h × $325.00', cents: 308750 },
      { title: 'Court appearance · letters', detail: 'L. Tran · 4.0h × $325.00', cents: 130000 },
      { title: 'Filing fees & appraisal', detail: 'Costs advanced', cents: 373750 },
    ],
  },
  {
    id: '092',
    number: 'INV-2026-092',
    client: 'Kessler Holdings LLC',
    matter: 'Kessler — Series B',
    totalCents: 2500000,
    status: 'sent',
    statusLabel: 'Sent · due Oct 9',
  },
  {
    id: '095',
    number: 'INV-2026-095',
    client: 'Marcus Webb',
    matter: 'People v. Webb',
    totalCents: 300000,
    status: 'draft',
    statusLabel: 'Draft',
  },
  {
    id: '094',
    number: 'INV-2026-094',
    client: 'Elena Delgado',
    matter: 'In re Marriage of Delgado',
    totalCents: 162500,
    status: 'partial',
    statusLabel: 'Partial · plan 2 of 4',
  },
  {
    id: '061',
    number: 'INV-2026-061',
    client: 'Thanh Nguyen',
    matter: 'Nguyen v. Cascade Property Mgmt',
    totalCents: 445000,
    status: 'paid',
    statusLabel: 'Paid Jul 18',
  },
];

export interface H1Contact {
  id: string;
  name: string;
  role: string;
  matter: string;
  matterId: MatterId;
  phone: string;
  email: string;
  kind: 'person' | 'org';
}

export const CONTACTS: H1Contact[] = [
  {
    id: 'alvarez',
    name: 'Sofia Alvarez',
    role: 'Client',
    matter: 'Alvarez v. Meridian',
    matterId: 'alvarez',
    phone: '(415) 555-0132',
    email: 'sofia.alvarez@mail.com',
    kind: 'person',
  },
  {
    id: 'bennett',
    name: 'Margaret Bennett',
    role: 'Client · Executor',
    matter: 'Estate of Bennett',
    matterId: 'bennett',
    phone: '(415) 555-0177',
    email: 'mbennett@mail.com',
    kind: 'person',
  },
  {
    id: 'kessler',
    name: 'Kessler Holdings LLC',
    role: 'Client',
    matter: 'Series B',
    matterId: 'kessler',
    phone: '(628) 555-0200',
    email: 'legal@kesslerholdings.com',
    kind: 'org',
  },
  {
    id: 'webb',
    name: 'Marcus Webb',
    role: 'Client',
    matter: 'People v. Webb',
    matterId: 'webb',
    phone: '(415) 555-0148',
    email: 'm.webb@mail.com',
    kind: 'person',
  },
  {
    id: 'delgado',
    name: 'Elena Delgado',
    role: 'Client',
    matter: 'Delgado',
    matterId: 'delgado',
    phone: '(415) 555-0163',
    email: 'elena.d@mail.com',
    kind: 'person',
  },
  {
    id: 'okonkwo',
    name: 'Chidi Okonkwo',
    role: 'Client',
    matter: 'Okonkwo I-130',
    matterId: 'okonkwo',
    phone: '(510) 555-0119',
    email: 'c.okonkwo@mail.com',
    kind: 'person',
  },
  {
    id: 'meridian',
    name: 'Meridian Logistics Inc.',
    role: 'Opposing party',
    matter: 'Alvarez v. Meridian',
    matterId: 'alvarez',
    phone: '(510) 555-0166',
    email: 'counsel@meridianlog.com',
    kind: 'org',
  },
  {
    id: 'patel',
    name: 'Dr. Anand Patel',
    role: 'Expert witness',
    matter: 'Alvarez v. Meridian',
    matterId: 'alvarez',
    phone: '(415) 555-0191',
    email: 'apatel@sfmedexperts.com',
    kind: 'person',
  },
  {
    id: 'court',
    name: 'SF Superior Court · Dept. 22',
    role: 'Court',
    matter: 'People v. Webb',
    matterId: 'webb',
    phone: '(415) 551-4000',
    email: 'dept22@sfsuperiorcourt.org',
    kind: 'org',
  },
];

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
/** Money for copy and KPIs. Amounts are integer cents; `showCents=false` drops the ".00" on tiles. */
export const money = (cents: number, showCents = true) =>
  showCents ? formatCents(Math.round(cents)) : wholeDollars.format(Math.round(cents) / 100);
export const roundedHours = (minutes: number) => Math.ceil(minutes / 6) / 10;
export const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
