/**
 * One fictional matter, used by every demonstration on the page so that names,
 * versions, dates and sources always agree. Sample data only: no real firm,
 * client or document. Dates are fixed (2026); weekdays were checked.
 */

export const PEOPLE = {
  priya: { name: 'Priya Shah', initials: 'PS', role: 'Associate', note: 'Responsible lawyer' },
  marcus: { name: 'Marcus Lee', initials: 'ML', role: 'Partner', note: 'Supervising partner' },
  jordan: { name: 'Jordan Ellis', initials: 'JE', role: 'Paralegal', note: 'Documents and tasks' },
  dana: {
    name: 'Dana Whitfield',
    initials: 'DW',
    role: 'General Counsel, Harlow & Finch',
    note: 'Client contact',
  },
} as const;

export type PersonKey = keyof typeof PEOPLE;

export const MATTER = {
  id: 'M-2041',
  title: 'Commercial agreement review',
  client: 'Harlow & Finch Ltd',
  counterparty: 'Norland Systems',
  practice: 'Commercial contracts',
  opened: 'Mon, Sep 14',
  responsible: 'priya' as PersonKey,
  stage: 'Negotiation',
  lastReview: 'Thu, Sep 24',
} as const;

export const DOCUMENT_VERSIONS = [
  {
    version: 'v3',
    name: 'Harlow–Norland MSA v3',
    file: 'Harlow-Norland_MSA_v3.docx',
    date: 'Wed, Sep 30 · 09:14',
    note: 'Received from Dana Whitfield',
    latest: true,
  },
  {
    version: 'v2',
    name: 'Harlow–Norland MSA v2',
    file: 'Harlow-Norland_MSA_v2.docx',
    date: 'Thu, Sep 24',
    note: 'Our markup, sent to Norland',
    latest: false,
  },
  {
    version: 'v1',
    name: 'Harlow–Norland MSA v1',
    file: 'Harlow-Norland_MSA_v1.docx',
    date: 'Mon, Sep 14',
    note: "Norland's first draft",
    latest: false,
  },
] as const;

/** The requested review date comes from the client's email. It is not a calculated legal deadline. */
export const REQUESTED_DATE = 'Fri, Oct 9';

export type SourceId = 'email' | 'clause-9-2' | 'clause-10-1' | 'clause-14-1' | 'note';

export interface Source {
  id: SourceId;
  /** Short reference shown in a citation chip. */
  ref: string;
  kind: 'Email' | 'Document' | 'Internal note';
  title: string;
  meta: string;
  /** The excerpt, with the changed words marked by [[double brackets]]. */
  excerpt: string;
  /** What the same passage said before, when there is a prior version. */
  previous?: string;
}

export const SOURCES: Record<SourceId, Source> = {
  email: {
    id: 'email',
    ref: 'Email · Sep 30',
    kind: 'Email',
    title: 'Norland MSA: revised draft (v3)',
    meta: 'Dana Whitfield to Priya Shah · Wed, Sep 30 · 09:14',
    excerpt:
      "Norland came back overnight with their revised draft, attached. The main changes are in the indemnity (9.2) and the liability cap (10.1), and they've shortened the termination notice. [[Could you review and send us your comments by Friday 9 October?]] We'd like to sign before month end.",
  },
  'clause-9-2': {
    id: 'clause-9-2',
    ref: 'MSA v3 · 9.2',
    kind: 'Document',
    title: 'Clause 9.2 Indemnity',
    meta: 'Harlow-Norland_MSA_v3.docx · page 11',
    excerpt:
      'The Supplier shall indemnify the Customer against third-party claims arising from the Supplier’s breach of Clause 12 (Data Protection)[[, excluding claims arising from the Customer’s instructions]].',
    previous:
      'The Supplier shall indemnify the Customer against third-party claims arising from the Supplier’s breach of Clause 12 (Data Protection).',
  },
  'clause-10-1': {
    id: 'clause-10-1',
    ref: 'MSA v3 · 10.1',
    kind: 'Document',
    title: 'Clause 10.1 Limitation of liability',
    meta: 'Harlow-Norland_MSA_v3.docx · page 12',
    excerpt:
      'Each party’s total liability under this Agreement shall not exceed the fees paid in the [[six (6) months]] preceding the claim.',
    previous:
      'Each party’s total liability under this Agreement shall not exceed the fees paid in the twelve (12) months preceding the claim.',
  },
  'clause-14-1': {
    id: 'clause-14-1',
    ref: 'MSA v3 · 14.1',
    kind: 'Document',
    title: 'Clause 14.1 Termination for convenience',
    meta: 'Harlow-Norland_MSA_v3.docx · page 15',
    excerpt: 'Either party may terminate this Agreement on [[thirty (30) days’]] written notice.',
    previous: 'Either party may terminate this Agreement on sixty (60) days’ written notice.',
  },
  note: {
    id: 'note',
    ref: 'Note · Sep 29',
    kind: 'Internal note',
    title: 'Client priorities',
    meta: 'Marcus Lee · Tue, Sep 29',
    excerpt:
      'Call with Dana: [[Harlow’s priority is keeping the 12-month liability cap.]] They are flexible on the termination notice period.',
  },
};

export const EMAIL = {
  from: PEOPLE.dana.name,
  fromDetail: 'dana.whitfield@harlowfinch.example',
  to: PEOPLE.priya.name,
  time: 'Wed, Sep 30 · 09:14',
  subject: 'Norland MSA: revised draft (v3)',
  attachment: 'Harlow-Norland_MSA_v3.docx',
  paragraphs: [
    'Hi Priya,',
    "Norland came back overnight with their revised draft, attached. The main changes are in the indemnity (9.2) and the liability cap (10.1), and they've shortened the termination notice.",
    "Could you review and send us your comments by Friday 9 October? We'd like to sign before month end.",
    'Thanks,\nDana',
  ],
} as const;

export interface Task {
  id: string;
  title: string;
  owner: PersonKey;
  date: string;
  dateKind: 'requested' | 'internal';
  origin: string;
  status: 'open' | 'suggested' | 'done';
}

export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Review revised indemnity and liability cap (v3)',
    owner: 'priya',
    date: REQUESTED_DATE,
    dateKind: 'requested',
    origin: 'Requested in Dana’s email of Sep 30',
    status: 'open',
  },
  {
    id: 't2',
    title: 'Update the clause comparison, v2 to v3',
    owner: 'jordan',
    date: 'Wed, Oct 7',
    dateKind: 'internal',
    origin: 'Internal target',
    status: 'open',
  },
  {
    id: 't3',
    title: 'Agree the position on the liability cap',
    owner: 'marcus',
    date: 'Wed, Oct 7',
    dateKind: 'internal',
    origin: 'Internal target',
    status: 'open',
  },
  {
    id: 't4',
    title: 'Send v2 markup to Norland',
    owner: 'priya',
    date: 'Thu, Sep 24',
    dateKind: 'internal',
    origin: 'Completed',
    status: 'done',
  },
];

export interface ActivityItem {
  id: string;
  time: string;
  day: string;
  actor: string;
  text: string;
  kind: 'email' | 'document' | 'task' | 'time' | 'ai' | 'call' | 'note';
}

export const ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    day: 'Wed, Sep 30',
    time: '11:12',
    actor: 'Clepso AI',
    text: 'Prepared a client-update draft from 3 sources. Awaiting review.',
    kind: 'ai',
  },
  {
    id: 'a2',
    day: 'Wed, Sep 30',
    time: '11:05',
    actor: 'Priya Shah',
    text: 'Recorded a voice note after the call.',
    kind: 'time',
  },
  {
    id: 'a3',
    day: 'Wed, Sep 30',
    time: '10:02',
    actor: 'Priya Shah',
    text: 'Call with Dana Whitfield on the liability cap, 40 min.',
    kind: 'call',
  },
  {
    id: 'a4',
    day: 'Wed, Sep 30',
    time: '09:20',
    actor: 'Priya Shah',
    text: 'Confirmed MSA v3 as the latest version.',
    kind: 'document',
  },
  {
    id: 'a5',
    day: 'Wed, Sep 30',
    time: '09:14',
    actor: 'Dana Whitfield',
    text: 'Emailed the revised draft (v3) and asked for comments by Fri, Oct 9.',
    kind: 'email',
  },
  {
    id: 'a6',
    day: 'Tue, Sep 29',
    time: '16:40',
    actor: 'Marcus Lee',
    text: 'Added a note on the client’s priorities.',
    kind: 'note',
  },
  {
    id: 'a7',
    day: 'Thu, Sep 24',
    time: '17:30',
    actor: 'Priya Shah',
    text: 'Sent the v2 markup to Norland.',
    kind: 'document',
  },
];

/** Work detected on Sep 30 that could support a time entry. */
export const DETECTED_ACTIVITY = [
  {
    id: 'call',
    label: 'Call with Dana Whitfield',
    detail: 'Calendar · 10:02–10:42',
    minutes: 40,
    suggested: true,
  },
  {
    id: 'markup',
    label: 'Markup of MSA v3, clauses 9–10',
    detail: 'Document edits · 25 min',
    minutes: 25,
    suggested: true,
  },
  {
    id: 'filing',
    label: 'Filing v3 to the matter',
    detail: 'Administrative · 8 min',
    minutes: 8,
    suggested: false,
  },
] as const;

export const VOICE_NOTE = {
  length: '0:21',
  time: 'Wed, Sep 30 · 11:05',
  transcript:
    'Forty minutes with Dana on the liability cap, then about twenty-five minutes marking up clause nine in version three.',
} as const;

export const TIME_ENTRY_DEFAULT = {
  matter: MATTER.id,
  tenths: 11, // 65 minutes, rounded to 1.1h
  narrative:
    'Call with D. Whitfield re liability cap and indemnity; review and markup of revised MSA (v3), cl. 9–10.',
} as const;

export const OTHER_MATTERS = [{ id: 'M-2033', title: 'Harlow & Finch · general advice' }] as const;

/** Items a client update can be built from. */
export const UPDATE_ITEMS = [
  {
    id: 'received',
    label: 'Received Norland’s revised draft (v3)',
    sentence: 'We have Norland’s revised draft (version 3) and are reviewing it now.',
    defaultOn: true,
  },
  {
    id: 'changes',
    label: 'Main changes: indemnity, liability cap, termination notice',
    sentence:
      'The main changes are a narrower indemnity, a lower liability cap (six months of fees instead of twelve) and a shorter termination notice.',
    defaultOn: true,
  },
  {
    id: 'call',
    label: 'Our call on Sep 30',
    sentence: 'Thanks for talking through the liability cap with me on Wednesday.',
    defaultOn: false,
  },
  {
    id: 'next',
    label: 'Next step and date',
    sentence:
      'Next: we will send you our comments by Friday, October 9. Nothing is needed from you before then.',
    defaultOn: true,
  },
] as const;

export type UpdateItemId = (typeof UPDATE_ITEMS)[number]['id'];

export function composeUpdate(selected: ReadonlySet<UpdateItemId>): string {
  const body = UPDATE_ITEMS.filter((i) => selected.has(i.id)).map((i) => i.sentence);
  if (body.length === 0) return '';
  return ['Hi Dana,', body.join(' '), 'Best,\nPriya'].join('\n\n');
}

/** Splits an excerpt into plain and marked parts ([[marked]]). */
export function splitMarked(text: string): { text: string; marked: boolean }[] {
  return text
    .split(/(\[\[.*?\]\])/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('[[')
        ? { text: part.slice(2, -2), marked: true }
        : { text: part, marked: false },
    );
}
