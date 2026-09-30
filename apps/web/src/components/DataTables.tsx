'use client';

import {
  Avatar,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  Mono,
  Pill,
  Table,
  type TableRow,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useWrites,
  type Task,
  type TimeEntry,
  type Invoice,
  type TrustLedgerEntry,
} from '@/lib/data';
import { fmtDate, hours, money, moneyOrDash } from '@/lib/format';
import { todayIso, weekdayOf } from '@/lib/clock';
import { useOverlays } from '@/stores/ui';

export const invoiceTone = (i: Invoice) =>
  (
    ({
      draft: 'neutral',
      sent: 'info',
      overdue: 'danger',
      partial: 'warning',
      paid: 'success',
    }) as const
  )[i.status];

export function TaskList({ tasks }: { tasks: Task[] }) {
  const { toggleTask } = useWrites();
  const notify = useOverlays((s) => s.notify);
  return tasks.length ? (
    <div className="cl-list">
      {tasks.map((t) => (
        <div className="cl-row" key={t.id}>
          <Checkbox
            checked={t.done}
            label={`Complete ${t.title}`}
            onChange={() => {
              const undo = toggleTask(t.id);
              notify(t.done ? 'Task reopened' : 'Task completed', 'Undo', undo);
            }}
          />
          <div className="cl-row__body">
            <div className={`cl-row__title ${t.done ? 'is-done' : ''}`}>{t.title}</div>
            <div className="cl-row__sub">{t.assignee}</div>
          </div>
          <span className={`cl-row__meta ${!t.done && t.tone !== 'neutral' ? `is-${t.tone}` : ''}`}>
            {t.dueAt === todayIso() ? 'Today' : fmtDate(t.dueAt)}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState icon="check" title="No tasks" text="Add a task from Capture." />
  );
}

export function TimeTable({
  entries,
  showMatter = false,
  groupByDate = false,
}: {
  entries: TimeEntry[];
  showMatter?: boolean;
  groupByDate?: boolean;
}) {
  const toRow = (e: TimeEntry): TableRow => ({
    id: e.id,
    strong: [5],
    cells: [
      fmtDate(e.date),
      showMatter ? (
        e.matterId ? (
          <Link key="matter" className="cell-title" href={`/matters/${e.matterId}?tab=Time`}>
            {e.matterLabel}
          </Link>
        ) : (
          e.matterLabel
        )
      ) : (
        e.timekeeper
      ),
      <span
        key="narrative"
        className="cl-truncate"
        style={{ display: 'block' }}
        title={e.narrative}
      >
        {e.narrative}
      </span>,
      <Mono key="code">{e.code}</Mono>,
      hours(e.minutes, ''),
      moneyOrDash(e.amountCents),
      <Pill
        key="status"
        tone={
          e.invoiceId
            ? 'accent'
            : e.status === 'Written down'
              ? 'warning'
              : e.status === 'Billable'
                ? 'success'
                : e.status === 'AI cleanup'
                  ? 'outline'
                  : 'neutral'
        }
      >
        {e.invoiceId ? 'On invoice' : e.status}
      </Pill>,
    ],
  });
  const rows: TableRow[] = [];
  if (groupByDate) {
    for (const date of [...new Set(entries.map((e) => e.date))].sort().reverse()) {
      const group = entries.filter((e) => e.date === date);
      rows.push({
        id: `day-${date}`,
        kind: 'group',
        cells: [
          `${date === todayIso() ? 'Today · ' : ''}${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekdayOf(date)]}, ${fmtDate(date)}`,
          hours(group.reduce((sum, e) => sum + e.minutes, 0)),
          money(group.reduce((sum, e) => sum + (e.amountCents ?? 0), 0)),
          '',
        ],
      });
      rows.push(...group.map(toRow));
    }
  } else rows.push(...entries.map(toRow));
  return entries.length ? (
    <Table
      compact
      className="app-time-table"
      columns={[
        { key: 'date', header: 'Date', width: '8%' },
        { key: 'who', header: showMatter ? 'Matter' : 'Timekeeper', width: '17%' },
        { key: 'narrative', header: 'Narrative', width: '36%' },
        { key: 'code', header: 'Code', width: '8%' },
        { key: 'hours', header: 'Hours', align: 'right', width: '8%' },
        { key: 'amount', header: 'Amount', align: 'right', width: '11%' },
        { key: 'status', header: 'Status', width: '12%' },
      ]}
      rows={rows}
    />
  ) : (
    <EmptyState icon="clock" title="No time entries" text="Start a timer or capture your work." />
  );
}

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  return invoices.length ? (
    <Table
      compact
      columns={[
        { key: 'invoice', header: 'Invoice' },
        { key: 'client', header: 'Client' },
        { key: 'matter', header: 'Matter' },
        { key: 'issued', header: 'Issued' },
        { key: 'due', header: 'Due' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'balance', header: 'Balance', align: 'right' },
        { key: 'status', header: 'Status' },
      ]}
      rows={invoices.map((i) => ({
        id: i.id,
        onClick: () => router.push(`/billing/invoices/${i.id}`),
        strong: [6],
        cells: [
          <Link key="number" href={`/billing/invoices/${i.id}`}>
            <Mono>{i.number}</Mono>
          </Link>,
          i.clientName,
          i.matterTitle,
          fmtDate(i.issuedAt),
          fmtDate(i.dueAt),
          money(i.totalCents),
          money(i.balanceCents),
          <Pill
            key="status"
            tone={invoiceTone(i)}
            dot={['overdue', 'partial', 'paid'].includes(i.status)}
          >
            {i.statusLabel}
          </Pill>,
        ],
      }))}
    />
  ) : (
    <EmptyState
      icon="receipt"
      title="No invoices"
      text="Generate drafts from approved time in pre-bill review."
    />
  );
}

export function TrustTable({ ledger }: { ledger: TrustLedgerEntry[] }) {
  return ledger.length ? (
    <Table
      compact
      columns={[
        { key: 'date', header: 'Date' },
        { key: 'description', header: 'Description' },
        { key: 'deposit', header: 'Deposit', align: 'right' },
        { key: 'disbursement', header: 'Disbursement', align: 'right' },
        { key: 'balance', header: 'Balance', align: 'right' },
      ]}
      rows={ledger.map((l, i) => ({
        id: `${l.date}-${i}`,
        strong: [4],
        cells: [
          fmtDate(l.date),
          l.description,
          moneyOrDash(l.depositCents),
          moneyOrDash(l.disbursementCents),
          money(l.balanceCents),
        ],
      }))}
    />
  ) : (
    <EmptyState icon="lock" title="No trust transactions" />
  );
}

export function PersonRow({
  name,
  initials,
  role,
  href,
  kind = 'person',
  tone = 'default',
}: {
  name: string;
  initials: string;
  role: string;
  href: string;
  kind?: 'person' | 'org';
  tone?: 'default' | 'ink' | 'accent';
}) {
  return (
    <Link className="cl-row cl-row--pressable" href={href}>
      <Avatar initials={initials} size="sm" kind={kind} tone={tone} />
      <div className="cl-row__body">
        <div className="cl-row__title">{name}</div>
        <div className="cl-row__sub">{role}</div>
      </div>
      <Icon name="chevron-right" className="cl-row__chev" />
    </Link>
  );
}

export function EmptyListAction({
  title,
  text,
  onClick,
  label,
}: {
  title: string;
  text: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <EmptyState
      icon="briefcase"
      title={title}
      text={text}
      action={
        <Button variant="primary" onClick={onClick}>
          {label}
        </Button>
      }
    />
  );
}
