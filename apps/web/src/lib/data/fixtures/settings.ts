import type { FirmProfile, Integration, Plan, PlanInvoice, Playbook } from '../types';

export const FIRM: FirmProfile = {
  name: 'Tran & Okafor LLP',
  stateBar: 'California',
  address: '1 Post St, Suite 2100, San Francisco, CA 94104',
  matterNumbering: 'YYYY-####',
  nextMatterNumber: '2026-0215',
  invoicePrefix: 'INV-YYYY-###',
  plan: {
    name: 'Clepso Pro',
    seats: 3,
    perSeatCents: 8900,
    cycle: 'annual',
    renewsOn: 'Oct 12, 2027',
  },
};

export const PLAYBOOKS: Playbook[] = [
  {
    name: 'Probate',
    meta: '5 stages · 9 deadline rules · Prob. Code',
    matterCount: 3,
    enabled: true,
  },
  {
    name: 'Personal injury',
    meta: '5 stages · 12 deadline rules · CCP',
    matterCount: 2,
    enabled: true,
  },
  {
    name: 'Corporate',
    meta: '4 stages · closing checklist · flat-fee milestones',
    matterCount: 1,
    enabled: true,
  },
  {
    name: 'Criminal defense',
    meta: '5 stages · 7 deadline rules · earned on receipt',
    matterCount: 1,
    enabled: true,
  },
  {
    name: 'Family',
    meta: '4 stages · 6 deadline rules · payment plans',
    matterCount: 1,
    enabled: true,
  },
  {
    name: 'Immigration',
    meta: '4 stages · USCIS timers · flat fee',
    matterCount: 1,
    enabled: true,
  },
];

export const INTEGRATIONS: Integration[] = [
  {
    name: 'QuickBooks',
    meta: 'Accounting · invoices and payments sync nightly',
    icon: 'dollar',
    connected: true,
  },
  {
    name: 'Google Calendar',
    meta: 'Court dates and deadlines · two-way',
    icon: 'calendar',
    connected: true,
  },
  { name: 'Stripe', meta: 'Text-to-pay · ACH and card', icon: 'dollar', connected: true },
  {
    name: 'Microsoft 365',
    meta: 'Calendar and email · two-way',
    icon: 'calendar',
    connected: false,
  },
  { name: 'Xero', meta: 'Accounting alternative to QuickBooks', icon: 'dollar', connected: false },
  {
    name: 'Clio',
    meta: 'One-time migration with reconciliation report',
    icon: 'download',
    connected: false,
  },
];

export const PLANS: Plan[] = [
  {
    key: 'core',
    name: 'Clepso Core',
    tagline: 'Your practice, organized. Solo lawyers and firms with straightforward workflows.',
    annualCents: 4900,
    monthlyCents: 5900,
    badge: null,
    addsLabel: 'A complete everyday practice',
    caps: [
      { icon: 'briefcase', label: 'Matters, contacts, tasks & calendar' },
      { icon: 'clock', label: 'Timers, time entries & expenses' },
      { icon: 'receipt', label: 'Hourly & flat-fee invoicing, pay links' },
      { icon: 'folder', label: 'Documents & basic reports' },
    ],
  },
  {
    key: 'pro',
    name: 'Clepso Pro',
    tagline: 'Capture more. Collect faster. Firms automating billing and daily work.',
    annualCents: 8900,
    monthlyCents: 10900,
    badge: 'Recommended',
    addsLabel: 'Everything in Core, plus',
    caps: [
      { icon: 'mic', label: 'Voice-to-time & Review your day' },
      { icon: 'pen', label: 'AI narratives · 500 / month' },
      { icon: 'receipt', label: 'Pre-bill, batch invoicing & approvals' },
      { icon: 'send', label: 'Auto-nudges & payment plans' },
      { icon: 'link', label: 'Playbooks, intake & integrations' },
    ],
  },
  {
    key: 'premier',
    name: 'Clepso Premier',
    tagline: 'Greater visibility. Complete control. Firms needing deeper reporting and controls.',
    annualCents: 12900,
    monthlyCents: 15900,
    badge: null,
    addsLabel: 'Everything in Pro, plus',
    caps: [
      { icon: 'chart', label: 'Budgets & profitability' },
      { icon: 'download', label: 'Custom reports, scheduled' },
      { icon: 'shield', label: 'Approval routing & staff roles' },
      { icon: 'sliders', label: 'Split billing, API & webhooks' },
      { icon: 'users', label: 'Priority support & migration' },
    ],
  },
];

export const CURRENT_PLAN = 'pro' as const;

export const PLAN_USAGE = [
  { label: 'AI narratives', text: '312 of 500', pct: 62 },
  { label: 'Storage', text: '38 GB of 100 GB', pct: 38 },
  { label: 'SMS', text: '148 sent · $11.84', pct: 30 },
];

export const PLAN_INVOICES: PlanInvoice[] = [
  {
    date: 'Oct 12',
    number: 'CLP-2026-0912',
    description: 'Clepso Pro · 3 users · annual',
    sub: 'Oct 12, 2026 – Oct 12, 2027',
    method: 'Visa ····4410',
    amountCents: 320400,
    status: 'Paid',
  },
  {
    date: 'Sep 1',
    number: 'CLP-2026-0871',
    description: 'Usage · August',
    sub: 'SMS $9.20 · card processing $186.40',
    method: 'Visa ····4410',
    amountCents: 19560,
    status: 'Paid',
  },
  {
    date: 'Aug 1',
    number: 'CLP-2026-0803',
    description: 'Usage · July',
    sub: 'SMS $7.40 · card processing $142.10',
    method: 'Visa ····4410',
    amountCents: 14950,
    status: 'Paid',
  },
  {
    date: 'Jul 3',
    number: 'CLP-2026-0744',
    description: 'Seat added · J. Whitfield',
    sub: 'Prorated to Oct 12, 2026',
    method: 'Visa ····4410',
    amountCents: 29700,
    status: 'Paid',
  },
  {
    date: 'Oct 12, 2025',
    number: 'CLP-2025-0410',
    description: 'Clepso Pro · 2 users · annual',
    sub: 'Oct 12, 2025 – Oct 12, 2026',
    method: 'Visa ····4410',
    amountCents: 213600,
    status: 'Paid',
  },
];
