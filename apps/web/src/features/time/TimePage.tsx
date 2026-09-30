'use client';

import { Banner, Button, Chip, KpiTile, SegmentedControl, Table, Toolbar } from '@lawfirm/ui-web';
import Link from 'next/link';
import { useState } from 'react';
import { Page, QueryGate } from '@/components/PageState';
import { NativeSelect } from '@/components/NativeSelect';
import { TimeTable } from '@/components/DataTables';
import {
  useBilledExtraMinutes,
  useTimeEntries,
  useExpenses,
  useTimekeepers,
  useMatters,
  usePrebill,
  useSettings,
} from '@/lib/data';
import { fmtDate, hours, money, moneyShort, plural } from '@/lib/format';
import { todayIso } from '@/lib/clock';
import { TODAY_METRICS } from '@/lib/data/fixtures';
import { useOverlays } from '@/stores/ui';

/** Blended standard rate behind "Value at standard" for the week already billed (design: 21.4h × $380). */
const BLENDED_RATE_CENTS = 38000;
/** Rate for time billed in this session (the current user, $425/h). */
const CURRENT_USER_RATE_CENTS = 42500;

export function TimePage() {
  const time = useTimeEntries();
  const expenses = useExpenses();
  const people = useTimekeepers();
  const matters = useMatters();
  const prebill = usePrebill();
  const settings = useSettings();
  const extra = useBilledExtraMinutes();
  const [period, setPeriod] = useState('Week');
  const [filter, setFilter] = useState('All');
  const [person, setPerson] = useState('All');
  const open = useOverlays((s) => s.openCapture);
  const today = todayIso();
  const weekStart = new Date(`${today}T12:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const inPeriod = (date: string) =>
    period === 'Month'
      ? date.slice(0, 7) === today.slice(0, 7)
      : date >= weekStartIso && date <= today;
  const entries = (time.data ?? []).filter(
    (e) => inPeriod(e.date) && (person === 'All' || e.timekeeper === person),
  );
  const isBillable = (e: (typeof entries)[number]) =>
    e.amountCents !== null && e.status !== 'No charge' && e.status !== 'Tracked only';
  const billable = entries.filter(isBillable);
  const visibleExpenses = (expenses.data ?? []).filter((e) => inPeriod(e.date));
  const billableExpenses = visibleExpenses.filter((e) => e.billable).length;
  // Firm aggregate shared with Today: the week billed so far plus anything billed in this session.
  const extraMinutes = extra.data ?? 0;
  const billedWeekMinutes = TODAY_METRICS.billedWeekMinutes + extraMinutes;
  const weekGoalHours = TODAY_METRICS.weeklyGoalMinutes / 60;
  const valueAtStandardCents =
    (TODAY_METRICS.billedWeekMinutes / 60) * BLENDED_RATE_CENTS +
    (extraMinutes / 60) * CURRENT_USER_RATE_CENTS;
  const suggestions = settings.data?.aiEnabled
    ? (prebill.data ?? []).filter((p) => p.ai && !p.aiDismissed && !p.invoiceId).length
    : 0;
  const counts: Record<string, number> = {
    All: entries.length,
    Billable: billable.length,
    'No charge': entries.filter((e) => !isBillable(e)).length,
    Expenses: visibleExpenses.length,
  };
  const sameMonth = weekStartIso.slice(0, 7) === today.slice(0, 7);
  const range =
    period === 'Week'
      ? `${fmtDate(weekStartIso)} – ${sameMonth ? Number(today.slice(8, 10)) : fmtDate(today)}`
      : 'September 2026';
  return (
    <QueryGate
      routeKey="time"
      queries={[time, expenses, people, matters, prebill, settings, extra]}
    >
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Time &amp; expenses</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              {range} · {hours(billedWeekMinutes)} billed ·{' '}
              {plural(visibleExpenses.length, 'expense')}
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <SegmentedControl
              value={period}
              onChange={setPeriod}
              items={['Week', 'Month'].map((v) => ({ value: v, label: v }))}
            />
            <Button icon="play" onClick={() => open('Start timer')}>
              Start timer
            </Button>
            <Button variant="primary" icon="plus" onClick={() => open('Log time')}>
              Log time
            </Button>
          </div>
        </div>
        <div className="cl-grid-4">
          <KpiTile
            label="Billable this week"
            value={hours(billedWeekMinutes, '')}
            tint
            unit={`of ${weekGoalHours}h`}
            progress={(billedWeekMinutes / TODAY_METRICS.weeklyGoalMinutes) * 100}
          />
          <KpiTile label="Non-billable" value="4.2" unit="h" delta="admin · intake · CLE" />
          <KpiTile
            label="Value at standard"
            value={moneyShort(valueAtStandardCents)}
            delta={
              (people.data ?? [])
                .filter((p) => p.rateCents > 0)
                .map((p) => moneyShort(p.rateCents))
                .join(' · ') + ' rates'
            }
          />
          <KpiTile
            label="Expenses"
            value={money(visibleExpenses.reduce((s, e) => s + e.amountCents, 0))}
            delta={`${plural(visibleExpenses.length, 'receipt')} · ${
              billableExpenses === visibleExpenses.length
                ? 'all billable'
                : `${billableExpenses} billable`
            }`}
          />
        </div>
        {suggestions ? (
          <Banner
            compact
            tone="outline"
            icon="pen"
            title={`${suggestions} narratives have AI cleanup suggestions · none applied`}
            trailing={
              <Link className="cl-btn cl-btn--secondary" href="/billing/prebill">
                Review in pre-bill
              </Link>
            }
          />
        ) : null}
        <Toolbar
          right={
            <NativeSelect
              appearance="chip"
              label="Timekeeper"
              value={person}
              onChange={setPerson}
              display={person === 'All' ? 'Timekeeper' : undefined}
              options={[
                { value: 'All', label: 'All timekeepers' },
                ...(people.data ?? []).map((p) => ({ value: p.short, label: p.name })),
              ]}
            />
          }
        >
          {['All', 'Billable', 'No charge', 'Expenses'].map((f) => (
            <Chip key={f} active={filter === f} count={counts[f]} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </Toolbar>
        {filter === 'Expenses' ? (
          <>
            <div className="cl-inline" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => open('Expense')}>
                Add expense
              </Button>
            </div>
            <Table
              compact
              columns={[
                { key: 'date', header: 'Date' },
                { key: 'matter', header: 'Matter' },
                { key: 'description', header: 'Description' },
                { key: 'amount', header: 'Amount', align: 'right' },
                { key: 'billable', header: 'Billable' },
              ]}
              rows={visibleExpenses.map((e) => ({
                id: e.id,
                strong: [3],
                cells: [
                  fmtDate(e.date),
                  matters.data?.find((m) => m.id === e.matterId)?.short,
                  e.description,
                  money(e.amountCents),
                  e.billable ? 'Yes' : 'No',
                ],
              }))}
            />
          </>
        ) : (
          <TimeTable
            showMatter
            groupByDate
            entries={entries.filter(
              (e) => filter === 'All' || (filter === 'Billable' ? isBillable(e) : !isBillable(e)),
            )}
          />
        )}
      </Page>
    </QueryGate>
  );
}
