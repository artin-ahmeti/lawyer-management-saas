import type { IconName } from '@lawfirm/ui-web';

export interface NavEntry {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: 'Work' | 'Money';
}

/** Sidebar IA: Today, Inbox, then Work and Money groups; Settings pinned to the footer. */
export const NAV: NavEntry[] = [
  { key: 'today', href: '/today', label: 'Today', icon: 'home' },
  { key: 'inbox', href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { key: 'matters', href: '/matters', label: 'Matters', icon: 'briefcase', group: 'Work' },
  { key: 'contacts', href: '/contacts', label: 'Contacts', icon: 'users', group: 'Work' },
  { key: 'calendar', href: '/calendar', label: 'Calendar', icon: 'calendar', group: 'Work' },
  { key: 'tasks', href: '/tasks', label: 'Tasks', icon: 'check', group: 'Work' },
  { key: 'documents', href: '/documents', label: 'Documents', icon: 'folder', group: 'Work' },
  { key: 'time', href: '/time', label: 'Time & expenses', icon: 'clock', group: 'Money' },
  { key: 'billing', href: '/billing', label: 'Billing', icon: 'receipt', group: 'Money' },
  { key: 'trust', href: '/trust', label: 'Trust', icon: 'lock', group: 'Money' },
  { key: 'reports', href: '/reports', label: 'Reports', icon: 'chart', group: 'Money' },
];

export interface RouteMeta {
  title: string;
  icon: IconName;
  emptyTitle: string;
  emptyText: string;
  emptyCta: string;
}

/** Copy for the empty and error states of each area. */
export const ROUTE_META: Record<string, RouteMeta> = {
  today: {
    title: 'Today',
    icon: 'home',
    emptyTitle: 'Nothing to review',
    emptyText: 'Every call, meeting and memo from today already has an entry.',
    emptyCta: 'Log time',
  },
  inbox: {
    title: 'Inbox',
    icon: 'inbox',
    emptyTitle: 'Inbox zero',
    emptyText: 'No leads waiting, no client messages unread, nothing to approve.',
    emptyCta: 'Back to Today',
  },
  matters: {
    title: 'Matters',
    icon: 'briefcase',
    emptyTitle: 'No matters yet',
    emptyText: 'Import from Clio or MyCase, or open your first matter from a playbook.',
    emptyCta: 'New matter',
  },
  matter: {
    title: 'this matter',
    icon: 'briefcase',
    emptyTitle: 'Nothing here yet',
    emptyText: 'This tab fills in as work is logged.',
    emptyCta: 'Log time',
  },
  contacts: {
    title: 'Contacts',
    icon: 'users',
    emptyTitle: 'No contacts yet',
    emptyText: 'Contacts arrive with your first matter or import.',
    emptyCta: 'New contact',
  },
  calendar: {
    title: 'Calendar',
    icon: 'calendar',
    emptyTitle: 'A clear week',
    emptyText: 'No court dates, deadlines or meetings scheduled.',
    emptyCta: 'New event',
  },
  tasks: {
    title: 'Tasks',
    icon: 'check',
    emptyTitle: 'All caught up',
    emptyText: 'No open tasks assigned to you.',
    emptyCta: 'New task',
  },
  documents: {
    title: 'Documents',
    icon: 'folder',
    emptyTitle: 'No documents',
    emptyText: 'Upload files or share a link for the client to upload.',
    emptyCta: 'Upload',
  },
  time: {
    title: 'Time & expenses',
    icon: 'clock',
    emptyTitle: 'No entries this period',
    emptyText: 'Start a timer or log time from Capture.',
    emptyCta: 'Log time',
  },
  billing: {
    title: 'Billing',
    icon: 'receipt',
    emptyTitle: 'Nothing to bill',
    emptyText: 'Unbilled time appears here at the end of the period.',
    emptyCta: 'Back to Today',
  },
  invoice: {
    title: 'this invoice',
    icon: 'receipt',
    emptyTitle: 'Invoice not found',
    emptyText: 'It may have been voided.',
    emptyCta: 'All invoices',
  },
  trust: {
    title: 'Trust',
    icon: 'lock',
    emptyTitle: 'No trust accounts',
    emptyText: 'Connect an IOLTA account to start tracking client funds.',
    emptyCta: 'Add account',
  },
  reports: {
    title: 'Reports',
    icon: 'chart',
    emptyTitle: 'Not enough data yet',
    emptyText: 'Reports appear after your first billed month.',
    emptyCta: 'Back to Today',
  },
  settings: {
    title: 'Settings',
    icon: 'settings',
    emptyTitle: 'Nothing here',
    emptyText: 'This section is empty.',
    emptyCta: 'Back',
  },
};

/** Which sidebar item lights up for a pathname. */
export function activeNavKey(pathname: string): string {
  const seg = pathname.split('/')[1] ?? '';
  return seg === '' ? 'today' : seg;
}
