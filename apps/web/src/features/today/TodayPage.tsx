'use client';

import {
  Amount,
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  IconWell,
  KpiTile,
  List,
  ListRow,
  MiniBars,
  Mono,
  Pill,
  SegmentedControl,
  SectionHeader,
  Sparkline,
  TimeBlock,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Page, QueryGate } from '@/components/PageState';
import {
  useBilledExtraMinutes,
  useDeadlines,
  useEvents,
  useMatters,
  useInvoices,
  usePayments,
  usePrebill,
  useReviewItems,
  useWrites,
  prebillAmount,
} from '@/lib/data';
import { CURRENT_USER, TODAY_METRICS, MATTERS, PAYMENTS } from '@/lib/data/fixtures';
import { todayIso } from '@/lib/clock';
import {
  fmtDate,
  fmtDateLong,
  fmtTime,
  hoursFromDecimal,
  money,
  moneyShort,
  whenLabel,
} from '@/lib/format';
import { useOverlays } from '@/stores/ui';

type Scope = 'me' | 'firm';
const daysLate = (dueAt: string) =>
  Math.max(0, Math.floor((Date.parse(todayIso()) - Date.parse(dueAt)) / 86400000));

/** Today: the morning page — what to bill, what is on, who to nudge, what is due. */
export function TodayPage() {
  const review = useReviewItems();
  const events = useEvents();
  const deadlines = useDeadlines();
  const matters = useMatters();
  const invoices = useInvoices();
  const payments = usePayments();
  const prebill = usePrebill();
  const extra = useBilledExtraMinutes();
  const router = useRouter();
  const { billReview, skipReview, billAllReview, textPayLink } = useWrites();
  const notify = useOverlays((s) => s.notify);
  const confirm = useOverlays((s) => s.confirm);
  const [scope, setScope] = useState<Scope>('me');
  const [chart, setChart] = useState<'hours' | 'value'>('hours');

  return (
    <QueryGate
      queries={[review, events, deadlines, matters, extra, invoices, payments, prebill]}
      routeKey="today"
    >
      {(() => {
        const items = review.data ?? [];
        const extraMin = extra.data ?? 0;
        const firm = scope === 'firm';
        const mult = firm ? 2.4 : 1;
        const billedWeekH = (TODAY_METRICS.billedWeekMinutes + extraMin) / 60;
        const weekGoalH = TODAY_METRICS.weeklyGoalMinutes / 60;
        const pace = billedWeekH / weekGoalH;
        const scopeMatters = (ms: typeof MATTERS) =>
          ms.filter((m) => firm || m.responsibleId === CURRENT_USER.id);
        const sumUnbilled = (ms: typeof MATTERS) =>
          scopeMatters(ms).reduce((sum, m) => sum + (m.unbilledCents ?? 0), 0);
        const unbilled =
          (firm ? TODAY_METRICS.unbilledCents.firm : TODAY_METRICS.unbilledCents.me) +
          sumUnbilled(matters.data ?? []) -
          sumUnbilled(MATTERS);
        const sumOutstanding = (ms: typeof MATTERS) =>
          ms.reduce((sum, m) => sum + m.outstandingCents, 0);
        const outstanding =
          TODAY_METRICS.outstandingCents +
          sumOutstanding(matters.data ?? []) -
          sumOutstanding(MATTERS);
        const collected =
          TODAY_METRICS.collectedMtdCents +
          (payments.data ?? []).reduce((sum, p) => sum + p.amountCents, 0) -
          PAYMENTS.reduce((sum, p) => sum + p.amountCents, 0);
        const nudgeInvoices = (invoices.data ?? [])
          .filter((i) => i.status !== 'draft' && i.balanceCents > 0)
          .slice(0, 2);
        const nextNudge = nudgeInvoices[0];
        const firstName = (name: string) => name.split(' ')[0] ?? name;
        const today = todayIso();
        const agenda = (events.data ?? []).filter((e) => e.startsAt.slice(0, 10) === today);
        const hearing = agenda.find((e) => e.kind === 'Court');
        const matterById = new Map((matters.data ?? []).map((m) => [m.id, m]));
        // The same count Billing's "Generate N invoices" uses: matters with a billable
        // pre-bill balance plus payment plans with an installment due.
        const prebillMatters = new Set<string>();
        (prebill.data ?? [])
          .filter((p) => !p.invoiceId && prebillAmount(p) > 0)
          .forEach((p) => prebillMatters.add(p.matterId));
        const planInstallments = (invoices.data ?? []).filter((i) => {
          if (i.status !== 'partial' || !/plan/i.test(i.terms)) return false;
          const count = Number(i.terms.match(/\d+/)?.[0]) || i.paymentPlan?.installments || 0;
          const paid = Number(i.statusLabel.match(/(\d+) of/)?.[1] ?? 0);
          return count > 0 && paid < count;
        }).length;
        const readyToInvoice = prebillMatters.size + planInstallments;
        /** "opened Sep 13" when the client opened the pay link, otherwise "sent Sep 10". */
        const linkStatus = (i: (typeof nudgeInvoices)[number]) => {
          const opened = i.activity.find((a) => a.action.includes('opened pay link'));
          return opened ? `opened ${opened.when.split(',')[0]}` : `sent ${fmtDate(i.issuedAt)}`;
        };
        const reviewHours = items.reduce((a, r) => a + r.hours, 0);
        const valueOf = (h: number) => `$${(h * 0.38).toFixed(1)}k`;

        const days = TODAY_METRICS.weekHours.map(
          (v, i) => (i === 3 ? v + extraMin / 60 : v) * mult,
        );
        const goal = firm ? 15 : 6;
        const tks = (firm ? TODAY_METRICS.timekeepersFirm : TODAY_METRICS.timekeepersMe).map(
          (t, i) => ({ ...t, hours: t.hours + (i === (firm ? 0 : 1) ? extraMin / 60 : 0) }),
        );
        const tmax = Math.max(...tks.map((t) => t.hours));
        const colors = [
          'var(--accent)',
          'var(--chart-seq-4, var(--accent))',
          'var(--chart-seq-3, var(--accent-ink))',
        ];

        const bill = (id: string) => {
          const r = items.find((x) => x.id === id);
          if (!r) return;
          const undo = billReview(id);
          notify(
            `Billed ${r.hours.toFixed(1)}h to ${matterById.get(r.matterId)?.short ?? 'matter'}`,
            'Undo',
            undo,
          );
        };
        const billAll = () => {
          const undo = billAllReview();
          notify(`Billed ${items.length} entries · +${reviewHours.toFixed(1)}h`, 'Undo', undo);
        };
        const askTextPayLink = () =>
          nextNudge &&
          confirm({
            title: `Text pay link to ${nextNudge.clientName}?`,
            text: `Sends a secure link for ${nextNudge.number} · ${money(nextNudge.balanceCents)} to ${nextNudge.contact}. ACH is offered first; card adds a 2.9% fee they can see before paying.`,
            cta: 'Text pay link',
            onConfirm: () =>
              notify(
                `Pay link texted to ${nextNudge.clientName} · ${money(nextNudge.balanceCents)}`,
                'Undo',
                textPayLink(nextNudge.id),
              ),
          });

        return (
          <Page wide>
            <div className="cl-pagehead">
              <div>
                <div className="cl-pagehead__eyebrow">{fmtDateLong(today)} · week 40</div>
                <h1 className="cl-h1--greeting">
                  Good morning, {CURRENT_USER.name.split(' ')[0]}.
                </h1>
                <div className="cl-t-body-sm cl-muted" style={{ marginTop: 6 }}>
                  {items.length
                    ? `${items.length} ${items.length > 1 ? 'entries' : 'entry'} to approve, `
                    : 'Entries are approved. '}
                  {hearing
                    ? `${items.length ? 'a' : 'A'} hearing at ${fmtTime(hearing.startsAt).time}`
                    : `${agenda.length} events today`}
                  {nextNudge ? `, and ${money(nextNudge.balanceCents)} waiting on a text.` : '.'}
                </div>
              </div>
              <div className="cl-pagehead__actions">
                <SegmentedControl
                  items={[
                    { value: 'me', label: 'Me' },
                    { value: 'firm', label: 'Firm' },
                  ]}
                  value={scope}
                  onChange={(v) => setScope(v as Scope)}
                />
              </div>
            </div>

            <div className="cl-grid-4 app-enter" style={{ animationDelay: '40ms' }}>
              <KpiTile
                className="app-today-billed"
                tint
                label="Billed this week"
                value={(billedWeekH * mult).toFixed(1)}
                unit="of 30h"
                progress={Math.min(100, Math.round(pace * 100))}
                delta={
                  pace >= 0.7
                    ? `On pace · ${TODAY_METRICS.hoursLeftThisWeek}h left for the week`
                    : `Behind pace · ${TODAY_METRICS.hoursLeftThisWeek}h left for the week`
                }
                style={{ gap: 6, padding: '16px 18px' }}
              />
              <Link
                href="/billing/prebill"
                className="cl-kpi is-link"
                style={{ gap: 6, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}
              >
                <span className="cl-kpi__label">Unbilled</span>
                <span className="cl-kpi__value">{moneyShort(unbilled)}</span>
                <Sparkline
                  points={[...TODAY_METRICS.sparkUnbilled]}
                  style={{ height: 30, marginTop: 4 }}
                />
                <span className="cl-kpi__delta">
                  {readyToInvoice
                    ? `${readyToInvoice} matter${readyToInvoice === 1 ? '' : 's'} ready to invoice`
                    : 'Nothing approved for invoicing yet'}
                </span>
              </Link>
              <Link
                href="/billing/invoices"
                className="cl-kpi is-link"
                style={{ gap: 6, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}
              >
                <span className="cl-kpi__label">Outstanding</span>
                <span className="cl-kpi__value">{moneyShort(outstanding)}</span>
                <div className="cl-stackbar" style={{ marginTop: 12, height: 8 }}>
                  <span style={{ width: '75%', background: 'var(--chart-seq-3, var(--accent))' }} />
                  <span style={{ width: '25%', background: 'var(--danger-dot)' }} />
                </div>
                <span className="cl-kpi__delta is-down">
                  <Icon name="alert" />
                  {moneyShort(
                    (invoices.data ?? [])
                      .filter((i) => i.status !== 'draft' && daysLate(i.dueAt) > 30)
                      .reduce((sum, i) => sum + i.balanceCents, 0),
                  )}{' '}
                  over 30 days
                </span>
              </Link>
              <div className="cl-kpi" style={{ gap: 6, padding: '16px 18px' }}>
                <span className="cl-kpi__label">Collected · MTD</span>
                <span className="cl-kpi__value">{moneyShort(collected)}</span>
                <Sparkline
                  points={[...TODAY_METRICS.sparkCollected]}
                  style={{ height: 30, marginTop: 4 }}
                />
                <span className="cl-kpi__delta is-up">
                  <Icon name="arrow-up-right" />
                  {TODAY_METRICS.collectedDeltaPct}% vs Aug · {TODAY_METRICS.daysToPaid} days to
                  paid
                </span>
              </div>
            </div>

            <div
              className="app-enter app-today-columns"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 24,
                alignItems: 'stretch',
                animationDelay: '90ms',
              }}
            >
              <Card flush style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="cl-card__head" style={{ padding: '16px 20px 8px' }}>
                  <div>
                    <div className="cl-card__title">Review your day</div>
                    <div className="cl-card__sub">
                      {items.length
                        ? `${items.length} thing${items.length > 1 ? 's' : ''} you probably billed for · +${reviewHours.toFixed(1)}h`
                        : 'All caught up'}
                    </div>
                  </div>
                  {items.length ? <Button onClick={billAll}>Bill all</Button> : null}
                </div>
                {items.length ? (
                  <List flat className="app-review-entries" style={{ padding: '0 20px', flex: 1 }}>
                    {items.map((r) => (
                      <ListRow
                        key={r.id}
                        className="app-enter"
                        style={{ paddingLeft: 0, paddingRight: 0 }}
                        lead={<IconWell name={r.icon} />}
                        title={r.title}
                        subtitle={r.sub}
                        trail={
                          <>
                            <Button
                              variant="primary"
                              onClick={() => bill(r.id)}
                            >{`Bill ${r.hours.toFixed(1)}h`}</Button>
                            <Button
                              variant="ghost"
                              iconOnly
                              icon="x"
                              aria-label="Skip"
                              onClick={() => skipReview(r.id)}
                            />
                          </>
                        }
                      />
                    ))}
                  </List>
                ) : (
                  <EmptyState
                    icon="check"
                    title="Nothing left to review"
                    text="Every call, meeting and memo from today has an entry."
                    action={
                      <Link href="/billing/prebill" className="cl-btn cl-btn--secondary">
                        Review pre-bill · {moneyShort(unbilled)}
                      </Link>
                    }
                    style={{ padding: 24, flex: 1, justifyContent: 'center' }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '12px 20px',
                    borderTop: '1px solid var(--hairline)',
                    font: 'var(--text-caption)',
                    color: 'var(--ink-2)',
                    marginTop: 'auto',
                  }}
                >
                  <span className="cl-inline cl-inline--nowrap" style={{ gap: 6 }}>
                    <Icon name="pen" size="sm" />
                    Drafted by AI · you approve
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    <b style={{ color: 'var(--ink)' }}>{TODAY_METRICS.capturedPct}%</b> of this
                    week’s hours from Capture
                  </span>
                </div>
              </Card>

              <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="cl-spread app-today-chart-head" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="cl-card__title">Hours · this week</div>
                    <div className="cl-card__sub">
                      {firm ? 'Firm · 3 timekeepers · goal 15h/day' : 'You · goal 6h/day'}
                    </div>
                  </div>
                  <SegmentedControl
                    items={[
                      { value: 'hours', label: 'Hours' },
                      { value: 'value', label: 'Value' },
                    ]}
                    value={chart}
                    onChange={(v) => setChart(v as 'hours' | 'value')}
                  />
                </div>
                <MiniBars
                  style={{ flex: 1 }}
                  bars={['Mon', 'Tue', 'Wed', 'Today', 'Fri'].map((label, i) => ({
                    label,
                    value: Number((days[i] ?? 0).toFixed(1)),
                    today: i === 3,
                    future: i === 4,
                  }))}
                  max={firm ? 22 : 9}
                  goal={goal}
                  goalLabel={chart === 'value' ? `goal ${valueOf(goal)}` : `goal ${goal}h`}
                  showValues={chart === 'hours'}
                />
                <div className="cl-divider" style={{ margin: '14px 0 12px' }} />
                <div className="cl-stack cl-stack--sm">
                  {tks.map((t, i) => (
                    <div
                      key={t.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '24px minmax(0,1fr) 56px',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Avatar
                        size="xs"
                        initials={t.initials}
                        kind={t.org ? 'org' : 'person'}
                        tone={t.initials === 'DO' ? 'accent' : 'default'}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="cl-spread" style={{ marginBottom: 4 }}>
                          <span
                            className="cl-t-caption cl-truncate"
                            style={{ color: 'var(--ink)' }}
                          >
                            {t.name}
                          </span>
                        </div>
                        <div className="cl-progress" style={{ margin: 0 }}>
                          <div
                            className="cl-progress__bar"
                            style={{
                              width: `${(t.hours / tmax) * 100}%`,
                              background: colors[i],
                              transition: 'width 700ms var(--ease-standard)',
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="cl-t-label cl-num"
                        style={{ textAlign: 'right', color: 'var(--ink)' }}
                      >
                        {chart === 'value' ? valueOf(t.hours) : hoursFromDecimal(t.hours)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div
              className="app-enter app-today-columns"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 24,
                alignItems: 'stretch',
                animationDelay: '140ms',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionHeader
                  title="Today"
                  count={agenda.length}
                  action="Open calendar"
                  onAction={() => router.push('/calendar')}
                />
                <List style={{ flex: 1 }}>
                  {agenda.map((e) => {
                    const t = fmtTime(e.startsAt);
                    return (
                      <ListRow
                        key={e.id}
                        lead={<TimeBlock main={t.time} sub={t.ampm} />}
                        title={e.title}
                        subtitle={e.sub}
                        pill={
                          <Pill tone={e.tone} dot={e.dot}>
                            {e.kind}
                          </Pill>
                        }
                        onClick={() => router.push(`/matters/${e.matterId}`)}
                      />
                    );
                  })}
                </List>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionHeader
                  title="Who to nudge"
                  action="All AR"
                  onAction={() => router.push('/billing/invoices')}
                />
                <Card flush style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <List flat style={{ padding: '0 16px', flex: 1 }}>
                    {nudgeInvoices.map((i) => (
                      <ListRow
                        key={i.id}
                        lead={
                          <Avatar
                            size="sm"
                            kind={matterById.get(i.matterId)?.clientKind ?? 'person'}
                            initials={
                              matterById.get(i.matterId)?.clientInitials ??
                              i.clientName
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join('')
                            }
                          />
                        }
                        title={i.clientName}
                        subtitle={
                          <>
                            <Mono>{i.number}</Mono>
                            <span className="sep">·</span>
                            {linkStatus(i)}
                          </>
                        }
                        value={money(i.balanceCents)}
                        meta={
                          daysLate(i.dueAt)
                            ? `${daysLate(i.dueAt)} days late`
                            : `Due ${fmtDate(i.dueAt)}`
                        }
                        metaTone={daysLate(i.dueAt) ? 'danger' : undefined}
                        onClick={() => router.push(`/billing/invoices/${i.id}`)}
                      />
                    ))}
                    {!nudgeInvoices.length ? (
                      <div className="cl-t-body-sm cl-muted" style={{ padding: 16 }}>
                        No payment reminders due.
                      </div>
                    ) : null}
                  </List>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '12px 16px',
                      borderTop: '1px solid var(--hairline)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button
                      variant="primary"
                      icon="send"
                      disabled={!nextNudge}
                      onClick={askTextPayLink}
                    >
                      {nextNudge
                        ? `Text pay link to ${firstName(nextNudge.clientName)}`
                        : 'Text pay link'}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!nextNudge}
                      onClick={() => nextNudge && router.push(`/billing/invoices/${nextNudge.id}`)}
                    >
                      Offer a plan
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            <div
              className="app-enter app-today-columns"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 24,
                alignItems: 'stretch',
                animationDelay: '190ms',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionHeader
                  title="Deadlines · next 14 days"
                  action="Docket"
                  onAction={() => router.push('/calendar')}
                />
                <List style={{ flex: 1 }}>
                  {(deadlines.data ?? []).map((d) => (
                    <ListRow
                      key={d.id}
                      title={d.title}
                      subtitle={d.sub}
                      pill={
                        <Pill tone={d.tone} dot={d.tone !== 'neutral'}>
                          {whenLabel(d.date)}
                        </Pill>
                      }
                      onClick={() => router.push(`/matters/${d.matterId}`)}
                    />
                  ))}
                </List>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="cl-section">
                  <span className="cl-section__title">Cash in · next 30 days</span>
                  <span className="cl-t-caption cl-muted">Sent invoices + plans</span>
                </div>
                <Card
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 14,
                  }}
                >
                  <Amount size="display" cents={TODAY_METRICS.cashIn.totalCents} />
                  <div className="cl-stackbar" style={{ height: 10 }}>
                    <span style={{ width: '23%', background: 'var(--danger-dot)' }} />
                    <span
                      style={{ width: '72%', background: 'var(--chart-seq-3, var(--accent))' }}
                    />
                    <span
                      style={{ width: '5%', background: 'var(--chart-seq-1, var(--accent-tint))' }}
                    />
                  </div>
                  <div className="cl-legend" style={{ gap: '6px 16px' }}>
                    <span>
                      <i style={{ background: 'var(--danger-dot)' }} />
                      Overdue<b>{moneyShort(TODAY_METRICS.cashIn.overdueCents)}</b>
                    </span>
                    <span>
                      <i style={{ background: 'var(--chart-seq-3, var(--accent))' }} />
                      Due by Oct 9<b>{moneyShort(TODAY_METRICS.cashIn.dueSoonCents)}</b>
                    </span>
                    <span>
                      <i style={{ background: 'var(--chart-seq-1, var(--accent-tint))' }} />
                      Plans<b>{money(TODAY_METRICS.cashIn.plansCents).replace('.00', '')}</b>
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          </Page>
        );
      })()}
    </QueryGate>
  );
}
