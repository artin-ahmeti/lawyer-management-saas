'use client';

import {
  AiSuggestion,
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  KpiTile,
  ListRow,
  Mono,
  Pill,
  SectionHeader,
  StageTracker,
  Table,
  Timeline,
  type IconName,
  type TableRow,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Page, PageEmpty, QueryGate } from '@/components/PageState';
import { PageTabs } from '@/components/PageTabs';
import { TaskList, TrustTable, invoiceTone } from '@/components/DataTables';
import {
  useMatter,
  useTasks,
  useContacts,
  useTimeEntries,
  useInvoices,
  useMatterActivity,
  useSettings,
  useDocuments,
  useTrustLedger,
  useTimekeepers,
  useWrites,
  type ActivityEvent,
  type TimeEntry,
} from '@/lib/data';
import { todayIso, toIsoDate } from '@/lib/clock';
import {
  daysFromToday,
  fmtDate,
  hours,
  money,
  moneyOrDash,
  moneyShort,
  parseIsoDate,
} from '@/lib/format';
import { downloadFile, csv } from '@/lib/download';
import { useOverlays } from '@/stores/ui';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { previewMode } from '@/lib/env';
import { LiveMatterPage } from './LiveMatterPage';

const TABS = ['Overview', 'Activity', 'Tasks', 'Time', 'Documents', 'Billing', 'Trust', 'Contacts'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
const addDays = (iso: string, days: number): string =>
  toIsoDate(new Date(parseIsoDate(iso).getTime() + days * DAY_MS));

/**
 * Activity timestamps arrive either preformatted ("Today, 8:40 AM",
 * "Sep 26, 4:05 PM") or as the ISO date of a time entry. Resolve both to an
 * instant so the feed reads newest first.
 */
function activityStamp(when: string): number {
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(when);
  if (iso) return parseIsoDate(iso[0]).getTime();
  const [dayPart = '', timePart = ''] = when.split(', ');
  const today = todayIso();
  let day: string | null = null;
  if (dayPart === 'Today') day = today;
  else if (dayPart === 'Yesterday') day = addDays(today, -1);
  else {
    const [mon = '', num = ''] = dayPart.split(' ');
    const monthIndex = MONTHS.indexOf(mon);
    if (monthIndex >= 0 && num) {
      day = `${today.slice(0, 4)}-${String(monthIndex + 1).padStart(2, '0')}-${num.padStart(2, '0')}`;
    }
  }
  if (!day) return 0;
  const clock = /(\d{1,2}):(\d{2}) (AM|PM)/.exec(timePart);
  const minutes = clock
    ? ((Number(clock[1]) % 12) + (clock[3] === 'PM' ? 12 : 0)) * 60 + Number(clock[2])
    : 12 * 60;
  return parseIsoDate(day).getTime() - 12 * 60 * 60_000 + minutes * 60_000;
}

/** ISO dates from time entries read as "Today" · "Yesterday" · "Sep 24". */
function activityWhen(when: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(when)) return when;
  const d = daysFromToday(when);
  return d === 0 ? 'Today' : d === -1 ? 'Yesterday' : fmtDate(when);
}

/**
 * Dated items in a playbook's deadline-chain suggestion: "… adds: notice to
 * creditors due Oct 17 · first accounting due Jun 3, 2027." → title + ISO date.
 */
function chainDeadlines(text: string): { title: string; date: string }[] {
  const after = text.split(':')[1];
  if (!after) return [];
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const out: { title: string; date: string }[] = [];
  for (const raw of after.split('·')) {
    const seg = raw.trim().replace(/\.$/, '');
    const match = /^(.*?)\s+([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?$/.exec(seg);
    if (!match) continue;
    const monthIndex = MONTHS.indexOf(match[2]!);
    if (monthIndex < 0) continue;
    const y = match[4] ? Number(match[4]) : monthIndex + 1 < month ? year + 1 : year;
    const title = match[1]!.trim();
    out.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      date: `${y}-${String(monthIndex + 1).padStart(2, '0')}-${match[3]!.padStart(2, '0')}`,
    });
  }
  return out;
}

const timeTone = (e: TimeEntry) =>
  e.invoiceId
    ? 'accent'
    : e.status === 'Written down'
      ? 'warning'
      : e.status === 'Billable'
        ? 'success'
        : e.status === 'AI cleanup'
          ? 'outline'
          : 'neutral';

const TIME_EMPTY: Record<string, string> = {
  Unbilled: 'No unbilled time',
  'On invoice': 'Nothing on an invoice yet',
  'No charge': 'Nothing marked no charge',
};

export function MatterPage({ id }: { id: string }) {
  return previewMode ? <PreviewMatterPage id={id} /> : <LiveMatterPage id={id} />;
}

function PreviewMatterPage({ id }: { id: string }) {
  const matter = useMatter(id);
  const tasks = useTasks();
  const contacts = useContacts();
  const time = useTimeEntries();
  const invoices = useInvoices();
  const activity = useMatterActivity(id);
  const settings = useSettings();
  const documents = useDocuments();
  const ledger = useTrustLedger(id);
  const people = useTimekeepers();
  const params = useSearchParams();
  const router = useRouter();
  const openCapture = useOverlays((s) => s.openCapture);
  const openForm = useOverlays((s) => s.openForm);
  const notify = useOverlays((s) => s.notify);
  const { markFiled, createEvent } = useWrites();
  const [taskFilter, setTaskFilter] = useState('Open');
  const [timeFilter, setTimeFilter] = useState('Unbilled');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const m = matter.data;
  const tab = TABS.includes(params.get('tab') ?? '') ? params.get('tab')! : 'Overview';
  const setTab = (value: string) => {
    const p = new URLSearchParams(params);
    p.set('tab', value);
    router.replace(`/matters/${id}?${p}`, { scroll: false });
  };
  const allTasks = (tasks.data ?? []).filter((t) => t.matterId === id);
  const openTasks = allTasks.filter((t) => !t.done);
  const visibleTasks = allTasks.filter((t) => t.done === (taskFilter === 'Done'));
  const entries = (time.data ?? []).filter((e) => e.matterId === id);
  const visibleEntries = entries.filter((e) =>
    timeFilter === 'On invoice'
      ? !!e.invoiceId
      : timeFilter === 'No charge'
        ? e.status === 'No charge'
        : !e.invoiceId && e.status !== 'No charge',
  );
  const bills = (invoices.data ?? [])
    .filter((i) => i.matterId === id)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const outstandingCents = bills
    .filter((i) => i.status !== 'draft')
    .reduce((s, i) => s + i.balanceCents, 0);
  const responsible = people.data?.find((p) => p.id === m?.responsibleId);
  const linkedPeople = (contacts.data ?? []).filter(
    (c) => c.id === m?.clientId || (!!m && c.matters.includes(m.short)),
  );

  // Time entries are also surfaced as "logged" events; when the curated feed
  // already narrates one (same person, same hours, same day) show it once.
  const feed: ActivityEvent[] = (() => {
    const all = activity.data ?? [];
    const curated = all.filter((a) => !/^\d{4}-\d{2}-\d{2}$/.test(a.when));
    return all
      .filter((a) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(a.when)) return true;
        const prefix = a.action.split(' · ')[0];
        return !curated.some(
          (c) =>
            c.actor === a.actor &&
            c.action.startsWith(prefix ?? '') &&
            Math.abs(activityStamp(c.when) - activityStamp(a.when)) < DAY_MS,
        );
      })
      .sort((a, b) => activityStamp(b.when) - activityStamp(a.when));
  })();

  const ledgerRows = ledger.data ?? [];
  const reconciledOn = ledgerRows.find((l) => /^reconciliation/i.test(l.description))?.date;
  const lastMovement = ledgerRows.find((l) => l.depositCents || l.disbursementCents);
  const noticeEvent = (activity.data ?? []).find((a) => /trust notice/i.test(a.action));
  const ruleTimers = lastMovement
    ? [
        noticeEvent
          ? `14-day notice sent ${noticeEvent.when.split(',')[0]}`
          : '14-day notice not yet sent',
        `45-day disbursement window closes ${fmtDate(addDays(lastMovement.date, 45))}`,
      ].join(' · ')
    : null;

  const addChainToDocket = () => {
    if (!m) return;
    const items = chainDeadlines(m.aiChain);
    if (!items.length) {
      openForm({ kind: 'event', matterId: id });
      return;
    }
    try {
      const undos = items.map((d) =>
        createEvent({
          startsAt: `${d.date}T09:00:00-07:00`,
          durationMin: 30,
          title: `${d.title} · ${m.short}`,
          sub: `Playbook · ${m.area}`,
          kind: 'Deadline',
          tone: 'warning',
          dot: true,
          matterId: id,
        }),
      );
      setSuggestionDismissed(true);
      notify(`${items.length} deadlines added to the docket`, 'Undo', () => {
        undos.forEach((undo) => undo());
        setSuggestionDismissed(false);
      });
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Could not add the deadlines.');
    }
  };

  const timeRows: TableRow[] = visibleEntries.map((e) => ({
    id: e.id,
    strong: [6],
    cells: [
      fmtDate(e.date),
      e.timekeeper,
      <span
        key="narrative"
        className="cl-truncate"
        style={{ display: 'block', maxWidth: 460 }}
        title={e.narrative}
      >
        {e.narrative}
      </span>,
      <Mono key="code">{e.code}</Mono>,
      hours(e.minutes, ''),
      money(e.rateCents),
      moneyOrDash(e.amountCents),
      <Pill key="status" tone={timeTone(e)}>
        {e.invoiceId ? 'On invoice' : e.status}
      </Pill>,
    ],
  }));

  const trustActions = (
    <div className="cl-inline" style={{ marginTop: 14 }}>
      <Button onClick={() => openForm({ kind: 'deposit', matterId: id })}>Record deposit</Button>
      <Button onClick={() => openForm({ kind: 'disbursement', matterId: id })}>Disburse</Button>
      <Button
        variant="ghost"
        onClick={() =>
          downloadFile(
            `${m?.number}-trust-ledger.csv`,
            csv([
              ['Date', 'Description', 'Deposit cents', 'Disbursement cents', 'Balance cents'],
              ...ledgerRows.map((l) => [
                l.date,
                l.description,
                l.depositCents,
                l.disbursementCents,
                l.balanceCents,
              ]),
            ]),
          )
        }
      >
        Ledger CSV
      </Button>
    </div>
  );

  const contactRows = [
    ...linkedPeople.map((c) => ({
      key: c.id,
      name: c.name,
      initials: c.initials,
      role: c.role,
      kind: c.kind,
      tone: c.role === 'Client' ? ('default' as const) : ('accent' as const),
      href: `/contacts?selected=${c.id}`,
      tel: `tel:${c.phone.replace(/[^+\d]/g, '')}`,
      message: `sms:${c.phone.replace(/[^+\d]/g, '')}`,
    })),
    ...(responsible
      ? [
          {
            key: responsible.id,
            name: responsible.name,
            initials: responsible.initials,
            role: 'Responsible attorney',
            kind: 'person' as const,
            tone: 'default' as const,
            href: '/settings?section=users',
            tel: null,
            message: `mailto:${responsible.email}`,
          },
        ]
      : []),
  ];

  return (
    <QueryGate
      routeKey="matter"
      queries={[matter, tasks, contacts, time, invoices, activity, ledger, people, documents]}
    >
      {!m ? (
        <PageEmpty
          routeKey="matter"
          action={
            <Link className="cl-btn cl-btn--primary" href="/matters">
              All matters
            </Link>
          }
        />
      ) : (
        <Page style={{ gap: 20 }}>
          <div>
            <div className="cl-crumbs">
              <Link href="/matters">Matters</Link>
              <Icon name="chevron-right" />
              <b>{m.title}</b>
            </div>
            <div className="cl-pagehead" style={{ marginTop: 8 }}>
              <div>
                <div className="cl-inline" style={{ gap: 10, marginBottom: 4 }}>
                  <Mono>{m.number}</Mono>
                  <Pill tone="accent">Open</Pill>
                  <Pill tone="outline">{m.billingLabel}</Pill>
                </div>
                <h1>{m.title}</h1>
                <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
                  {m.clientName} · {m.area} · {responsible?.short} · opened {fmtDate(m.openedAt)}
                </div>
              </div>
              <div className="cl-pagehead__actions">
                <Button icon="play" onClick={() => openCapture('Start timer', { matterId: id })}>
                  Start timer
                </Button>
                <Button icon="clock" onClick={() => openCapture('Log time', { matterId: id })}>
                  Log time
                </Button>
                <Link className="cl-btn cl-btn--primary" href={`/billing/prebill?matter=${id}`}>
                  <Icon name="receipt" />
                  Bill {moneyOrDash(m.unbilledCents)}
                </Link>
                <Button
                  variant="ghost"
                  iconOnly
                  icon="more"
                  aria-label="More"
                  onClick={() => notify('Matter actions · coming in this flow')}
                />
              </div>
            </div>
          </div>
          <PageTabs
            tabs={TABS.map((t) => ({
              key: t,
              label: t,
              count: (
                {
                  Tasks: openTasks.length,
                  Time: entries.length,
                  Documents: (documents.data ?? []).filter((d) => d.matterId === id).length,
                  Billing: bills.length,
                  Contacts: contactRows.length,
                } as Record<string, number>
              )[t],
            }))}
            value={tab}
            onChange={setTab}
          />
          <div role="tabpanel" aria-label={tab} className="app-fade" key={tab}>
            {tab === 'Overview' ? (
              <div className="cl-stack cl-stack--xl">
                <Card>
                  <div className="cl-spread" style={{ marginBottom: 10 }}>
                    <span className="cl-t-body-strong">Playbook · {m.area}</span>
                    <span className="cl-t-caption cl-muted">
                      Stage {m.stageIndex} of {m.stages.length}
                    </span>
                  </div>
                  <StageTracker
                    stages={m.stages.map((label, i) => ({
                      label,
                      state:
                        i + 1 < m.stageIndex
                          ? 'done'
                          : i + 1 === m.stageIndex
                            ? 'current'
                            : 'upcoming',
                    }))}
                  />
                </Card>
                {m.deadline ? (
                  <Banner
                    tone={m.deadline.tone === 'neutral' ? 'outline' : m.deadline.tone}
                    icon="alert"
                    title={m.deadline.long}
                    text={m.deadline.rule}
                    style={{ alignItems: 'flex-start' }}
                    actions={
                      <>
                        <Button
                          onClick={() => {
                            const undo = markFiled(id);
                            notify('Deadline marked filed · docket updated', 'Undo', undo);
                          }}
                        >
                          Mark filed
                        </Button>
                        <Link className="cl-btn cl-btn--ghost" href="/calendar">
                          Open docket
                        </Link>
                      </>
                    }
                  />
                ) : null}
                {settings.data?.aiEnabled && m.aiChain && !suggestionDismissed ? (
                  <AiSuggestion
                    label="Deadline chain suggestion · not applied"
                    text={m.aiChain}
                    actions={[
                      { label: 'Add to docket', onClick: addChainToDocket },
                      {
                        label: 'Adjust',
                        quiet: true,
                        onClick: () => openForm({ kind: 'event', matterId: id }),
                      },
                      {
                        label: 'Dismiss',
                        quiet: true,
                        onClick: () => setSuggestionDismissed(true),
                      },
                    ]}
                  />
                ) : null}
                <div className="cl-grid-4">
                  <KpiTile
                    label="Unbilled"
                    value={moneyOrDash(m.unbilledCents, true)}
                    delta={m.unbilledMeta}
                  />
                  <KpiTile
                    label="Trust balance"
                    value={moneyOrDash(m.trustCents, true)}
                    delta="IOLTA ····4821"
                  />
                  <KpiTile
                    label="Hours to date"
                    value={m.hoursToDate.toFixed(1)}
                    delta={m.hoursMeta}
                  />
                  <KpiTile
                    label="Collected"
                    value={moneyOrDash(m.collectedCents, true)}
                    delta={m.collectedMeta}
                    deltaTone="up"
                    deltaIcon="check"
                  />
                </div>
                <div className="cl-cols cl-cols--2">
                  <div>
                    <SectionHeader
                      title="Tasks"
                      count={openTasks.length}
                      action="All tasks"
                      onAction={() => setTab('Tasks')}
                    />
                    <TaskList tasks={openTasks.slice(0, 3)} />
                  </div>
                  <div>
                    <SectionHeader
                      title="Recent time"
                      action="All entries"
                      onAction={() => setTab('Time')}
                    />
                    {entries.length ? (
                      <div className="cl-list">
                        {entries.slice(0, 3).map((e) => (
                          <ListRow
                            key={e.id}
                            regular
                            lead={<span className="cl-row__time">{fmtDate(e.date)}</span>}
                            title={e.narrative}
                            subtitle={
                              <>
                                {e.timekeeper} <span className="sep">·</span> <Mono>{e.code}</Mono>
                              </>
                            }
                            value={moneyOrDash(e.amountCents)}
                            meta={hours(e.minutes)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="clock"
                        title="No time yet"
                        text="Start a timer or log time from Capture."
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            {tab === 'Activity' ? (
              feed.length ? (
                <Card style={{ maxWidth: 760 }}>
                  <Timeline
                    events={feed.map((a) => ({
                      title: (
                        <>
                          <b>{a.actor}</b> {a.action}
                          {a.audioUrl ? (
                            <audio
                              controls
                              src={a.audioUrl}
                              aria-label="Voice memo playback"
                              style={{ display: 'block', maxWidth: '100%', marginTop: 8 }}
                            />
                          ) : null}
                        </>
                      ),
                      meta: activityWhen(a.when),
                      icon: a.icon as IconName,
                      tone: a.accent ? 'accent' : 'default',
                      quote: a.quote,
                    }))}
                  />
                </Card>
              ) : (
                <div className="cl-table-wrap" style={{ maxWidth: 760 }}>
                  <EmptyState
                    icon="clock"
                    title="Nothing here yet"
                    text="This tab fills in as work is logged."
                  />
                </div>
              )
            ) : null}
            {tab === 'Tasks' ? (
              <div className="cl-stack cl-stack--lg" style={{ maxWidth: 840 }}>
                <div className="cl-toolbar">
                  <Chip
                    active={taskFilter === 'Open'}
                    count={openTasks.length}
                    onClick={() => setTaskFilter('Open')}
                  >
                    Open
                  </Chip>
                  <Chip active={taskFilter === 'Done'} onClick={() => setTaskFilter('Done')}>
                    Done
                  </Chip>
                  <div className="cl-toolbar__right">
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => openCapture('Task', { matterId: id })}
                    >
                      New task
                    </Button>
                  </div>
                </div>
                {visibleTasks.length ? (
                  <TaskList tasks={visibleTasks} />
                ) : (
                  <div className="cl-table-wrap">
                    <EmptyState
                      icon="check"
                      title={taskFilter === 'Done' ? 'Nothing done yet' : 'All caught up'}
                      text={
                        taskFilter === 'Done'
                          ? 'Tasks you check off on this matter land here.'
                          : 'No open tasks on this matter.'
                      }
                    />
                  </div>
                )}
              </div>
            ) : null}
            {tab === 'Time' ? (
              <div className="cl-stack cl-stack--lg">
                <div className="cl-toolbar">
                  {['Unbilled', 'On invoice', 'No charge'].map((f) => (
                    <Chip key={f} active={timeFilter === f} onClick={() => setTimeFilter(f)}>
                      {f}
                    </Chip>
                  ))}
                  <div className="cl-toolbar__right">
                    <span className="cl-t-caption cl-muted">
                      {m.hoursToDate.toFixed(1)}h · {moneyOrDash(m.unbilledCents)} unbilled
                    </span>
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => openCapture('Log time', { matterId: id })}
                    >
                      Log time
                    </Button>
                  </div>
                </div>
                {timeRows.length ? (
                  <Table
                    compact
                    columns={[
                      { key: 'date', header: 'Date' },
                      { key: 'who', header: 'Timekeeper' },
                      { key: 'narrative', header: 'Narrative', width: '44%' },
                      { key: 'code', header: 'Code' },
                      { key: 'hours', header: 'Hours', align: 'right' },
                      { key: 'rate', header: 'Rate', align: 'right' },
                      { key: 'amount', header: 'Amount', align: 'right' },
                      { key: 'status', header: 'Status' },
                    ]}
                    rows={timeRows}
                  />
                ) : (
                  <div className="cl-table-wrap">
                    <EmptyState
                      icon="clock"
                      title={TIME_EMPTY[timeFilter] ?? 'No time entries'}
                      text="Start a timer or log time from Capture."
                    />
                  </div>
                )}
              </div>
            ) : null}
            {tab === 'Documents' ? <DocumentsPage matterId={id} embedded /> : null}
            {tab === 'Billing' ? (
              <div className="cl-stack cl-stack--xl">
                <div className="cl-grid-4">
                  <KpiTile
                    label="Unbilled"
                    value={moneyOrDash(m.unbilledCents, true)}
                    delta={m.unbilledMeta}
                    tint
                  />
                  <KpiTile label="Outstanding" value={money(outstandingCents)} />
                  <KpiTile label="Collected" value={moneyShort(m.collectedCents)} />
                  <KpiTile
                    label="Rate"
                    value={<span style={{ fontSize: 20 }}>{m.billingLabel}</span>}
                  />
                </div>
                <div>
                  <SectionHeader
                    title="Invoices"
                    action="Generate from unbilled"
                    onAction={() => router.push(`/billing/prebill?matter=${id}`)}
                  />
                  {bills.length ? (
                    <div className="cl-list">
                      {bills.map((i) => (
                        <ListRow
                          key={i.id}
                          onClick={() => router.push(`/billing/invoices/${i.id}`)}
                          lead={
                            <span className="cl-ic-well">
                              <Icon name="receipt" />
                            </span>
                          }
                          title={<Mono ink>{i.number}</Mono>}
                          subtitle={[
                            fmtDate(i.issuedAt),
                            i.status === 'paid'
                              ? i.statusLabel.replace(/^Paid/, 'paid')
                              : `due ${fmtDate(i.dueAt)}`,
                            i.payLink === 'opened'
                              ? 'pay link opened'
                              : i.payLink === 'texted'
                                ? 'pay link texted'
                                : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          value={money(i.totalCents)}
                          pill={
                            <Pill tone={invoiceTone(i)} dot>
                              {i.statusLabel}
                            </Pill>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="cl-table-wrap">
                      <EmptyState
                        icon="receipt"
                        title="No invoices"
                        text="Generate the first one from unbilled time in pre-bill review."
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {tab === 'Trust' ? (
              m.trustCents === null && !ledgerRows.length ? (
                <div className="cl-table-wrap" style={{ maxWidth: 760 }}>
                  <EmptyState
                    icon="lock"
                    title="No trust funds on this matter"
                    text="Record a retainer deposit to open a client trust ledger."
                    action={
                      <Button
                        variant="primary"
                        onClick={() => openForm({ kind: 'deposit', matterId: id })}
                      >
                        Record deposit
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="cl-cols cl-cols--2">
                  <div className="cl-stack cl-stack--lg">
                    <Card>
                      <div className="cl-spread" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <div className="cl-t-label cl-muted">Trust balance · IOLTA ····4821</div>
                          <div className="cl-amount cl-amount--display" style={{ marginTop: 4 }}>
                            {money(m.trustCents ?? 0)}
                          </div>
                        </div>
                        {reconciledOn ? (
                          <Pill tone="success" dot>
                            Reconciled {fmtDate(reconciledOn)}
                          </Pill>
                        ) : null}
                      </div>
                      {trustActions}
                    </Card>
                    <TrustTable ledger={ledgerRows} />
                  </div>
                  <div className="cl-stack cl-stack--lg">
                    {ruleTimers ? (
                      <Banner
                        tone="outline"
                        icon="lock"
                        title="Rule 1.15 timers"
                        text={`${ruleTimers}. Both are on the docket.`}
                        style={{ alignItems: 'flex-start' }}
                      />
                    ) : null}
                  </div>
                </div>
              )
            ) : null}
            {tab === 'Contacts' ? (
              contactRows.length ? (
                <div className="cl-list" style={{ maxWidth: 760 }}>
                  {contactRows.map((p) => (
                    <ListRow
                      key={p.key}
                      onClick={() => router.push(p.href)}
                      lead={<Avatar initials={p.initials} size="sm" kind={p.kind} tone={p.tone} />}
                      title={p.name}
                      subtitle={p.role}
                      trail={
                        <>
                          {p.tel ? (
                            <a
                              className="cl-btn cl-btn--ghost cl-btn--icon"
                              aria-label={`Call ${p.name}`}
                              href={p.tel}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icon name="phone" />
                            </a>
                          ) : null}
                          <a
                            className="cl-btn cl-btn--ghost cl-btn--icon"
                            aria-label={`Message ${p.name}`}
                            href={p.message}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon name="message" />
                          </a>
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="cl-table-wrap" style={{ maxWidth: 760 }}>
                  <EmptyState
                    icon="users"
                    title="No linked contacts"
                    text="People on this matter appear here as they are added."
                  />
                </div>
              )
            ) : null}
          </div>
        </Page>
      )}
    </QueryGate>
  );
}
