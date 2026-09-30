'use client';

import {
  AiSuggestion,
  Banner,
  Button,
  Checkbox,
  Chip,
  Field,
  FormRow,
  Input,
  KpiTile,
  Mono,
  Pill,
  SegmentedControl,
  StackedBar,
  Stepper,
  Switch,
  Table,
  Textarea,
  Toolbar,
  type TableRow,
} from '@lawfirm/ui-web';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DrawerLayout } from '@/components/DrawerLayout';
import { NativeSelect } from '@/components/NativeSelect';
import { QueryGate } from '@/components/PageState';
import { InvoiceTable } from '@/components/DataTables';
import {
  usePrebill,
  useMatters,
  useInvoices,
  usePayments,
  useSettings,
  useWrites,
  prebillAmount,
  type Invoice,
  type Matter,
  type PrebillEntry,
} from '@/lib/data';
import { INVOICES, MATTERS, PAYMENTS, TODAY_METRICS } from '@/lib/data/fixtures';
import { fmtDate, hours, money, moneyShort, plural } from '@/lib/format';
import { useOverlays } from '@/stores/ui';

export type BillingTab = 'prebill' | 'invoices' | 'payments';

/**
 * Firm aggregates the API will compute (Plan: money and aggregates are API
 * only). They mirror the design's figures until `TODAY_METRICS` grows them.
 */
const BILLING_METRICS = TODAY_METRICS.billing;

const WRITE_DOWN_REASONS = [
  'None',
  'Duplicate research',
  'Adjusted at review',
  'Client courtesy',
  'Training time',
];

/** The next installment on a partially paid payment-plan invoice ("plan 3 of 4 · $1,625.00"). */
function planInstallment(i: Invoice) {
  if (i.status !== 'partial' || !/plan/i.test(i.terms)) return null;
  const count = Number(i.terms.match(/\d+/)?.[0]) || i.paymentPlan?.installments || 0;
  const paid = Number(i.statusLabel.match(/(\d+) of/)?.[1] ?? 0);
  if (!count || paid >= count) return null;
  return { invoice: i, next: paid + 1, count, amountCents: Math.round(i.totalCents / count) };
}

const listOf = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export function BillingPage({ tab }: { tab: BillingTab }) {
  const prebill = usePrebill();
  const matters = useMatters();
  const invoices = useInvoices();
  const payments = usePayments();
  const settings = useSettings();
  const writes = useWrites();
  const router = useRouter();
  const params = useSearchParams();
  const notify = useOverlays((s) => s.notify);
  const confirm = useOverlays((s) => s.confirm);
  const openForm = useOverlays((s) => s.openForm);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const matterId = params.get('matter') ?? undefined;
  const aiEnabled = settings.data?.aiEnabled ?? false;
  const matterById = new Map((matters.data ?? []).map((m) => [m.id, m]));

  // ── Pre-bill ────────────────────────────────────────────────────────────
  const entries = (prebill.data ?? []).filter(
    (p) => !p.invoiceId && (!matterId || p.matterId === matterId),
  );
  const selected = entries.find((p) => p.id === params.get('entry'));
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('entry', id);
    else next.delete('entry');
    router.replace(`/billing/prebill${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  const groupIds = [...new Set(entries.map((p) => p.matterId))];
  const groupOf = (id: string) => entries.filter((p) => p.matterId === id);
  const groupAmount = (id: string) => groupOf(id).reduce((s, p) => s + prebillAmount(p), 0);
  const groupStatus = (m: Matter | undefined, id: string) =>
    groupAmount(id) > 0
      ? 'Approved'
      : /earned on receipt/i.test(m?.billingLabel ?? '')
        ? 'Earned on receipt'
        : 'Tracked only';
  const readyMatters = groupIds
    .filter((id) => groupAmount(id) > 0)
    .map((id) => matterById.get(id))
    .filter((m): m is Matter => !!m);
  const installments = (invoices.data ?? [])
    .filter((i) => !matterId || i.matterId === matterId)
    .map(planInstallment)
    .filter((p): p is NonNullable<typeof p> => !!p);
  const readyCount = readyMatters.length + installments.length;
  const readyCents = readyMatters.reduce((s, m) => s + (m.unbilledCents ?? 0), 0);
  const total = entries.reduce((s, p) => s + prebillAmount(p), 0);
  // Firm unbilled is an aggregate shared with Today; session writes move it through the matters.
  const sumUnbilled = (ms: Matter[]) => ms.reduce((s, m) => s + (m.unbilledCents ?? 0), 0);
  const unbilled =
    TODAY_METRICS.unbilledCents.firm + sumUnbilled(matters.data ?? []) - sumUnbilled(MATTERS);
  const writtenDown = entries.filter((p) => p.originalMinutes && p.originalMinutes > p.minutes);
  const writeDown = writtenDown.reduce(
    (s, p) => s + Math.round((((p.originalMinutes ?? p.minutes) - p.minutes) * p.rateCents) / 60),
    0,
  );
  const suggestions = aiEnabled ? entries.filter((p) => p.ai && !p.aiDismissed) : [];
  const patch = (p: PrebillEntry, update: Partial<PrebillEntry>) =>
    writes.patchPrebill(p.id, update);
  const includable = entries.filter((p) => !p.tracked && !p.noCharge);
  const allIncluded = includable.length > 0 && includable.every((p) => !p.excluded);
  const entryPill = (p: PrebillEntry) =>
    p.noCharge
      ? 'No charge'
      : p.tracked
        ? 'Tracked only'
        : p.approved
          ? 'Approved'
          : p.originalMinutes
            ? 'Written down'
            : aiEnabled && p.ai && !p.aiDismissed
              ? 'AI cleanup'
              : null;

  const rows: TableRow[] = [];
  for (const id of groupIds) {
    const m = matterById.get(id);
    const group = groupOf(id);
    const gStatus = groupStatus(m, id);
    rows.push({
      id: `g-${id}`,
      kind: 'group',
      cells: [
        <span key="label">
          {m?.title} · <Mono>{m?.number}</Mono> · {m?.billingLabel}
        </span>,
        <span key="hours" style={{ textTransform: 'none' }}>
          {hours(group.reduce((sum, p) => sum + p.minutes, 0))}
        </span>,
        '',
        <span key="amount" style={{ textTransform: 'none' }}>
          {money(groupAmount(id))}
        </span>,
        <Pill
          key="status"
          dot
          tone={gStatus === 'Approved' ? 'success' : 'neutral'}
          style={{ textTransform: 'none', letterSpacing: 0 }}
        >
          {gStatus}
        </Pill>,
      ],
    });
    rows.push(
      ...group.map((p): TableRow => {
        const pill = entryPill(p);
        return {
          id: p.id,
          selected: selected?.id === p.id,
          onClick: () => select(p.id),
          strong: [7],
          cells: [
            <Checkbox
              key="include"
              shape="square"
              label={`Include ${p.narrative}`}
              checked={!p.excluded && !p.tracked && !p.noCharge}
              disabled={p.tracked || p.noCharge}
              onChange={() => patch(p, { excluded: !p.excluded })}
            />,
            fmtDate(p.date),
            p.timekeeper,
            <span
              className="cl-truncate"
              key="narrative"
              title={p.narrative}
              style={{ display: 'block', width: 0, minWidth: '100%', maxWidth: 420 }}
            >
              {p.narrative}
            </span>,
            <Mono key="code">{p.code}</Mono>,
            p.flatCents !== null ? (
              '—'
            ) : (
              <span key="hours">
                {hours(p.minutes, '')}
                {p.originalMinutes ? (
                  <span
                    className="cl-muted"
                    style={{ textDecoration: 'line-through', marginLeft: 4 }}
                  >
                    {hours(p.originalMinutes, '')}
                  </span>
                ) : null}
              </span>
            ),
            p.tracked
              ? '—'
              : p.flatCents !== null
                ? p.expenseId
                  ? 'expense'
                  : 'flat'
                : money(p.rateCents),
            p.tracked || p.noCharge ? '—' : money(prebillAmount(p)),
            pill ? (
              <Pill
                key="status"
                icon={pill === 'AI cleanup' ? 'pen' : undefined}
                tone={
                  pill === 'Approved'
                    ? 'success'
                    : pill === 'Written down'
                      ? 'warning'
                      : pill === 'AI cleanup'
                        ? 'outline'
                        : 'neutral'
                }
              >
                {pill}
              </Pill>
            ) : (
              ''
            ),
          ],
        };
      }),
    );
  }
  if (entries.length)
    rows.push({
      id: 'totals',
      kind: 'foot',
      cells: [
        '',
        `${plural(groupIds.length, 'matter')} · ${plural(entries.length, 'entry', 'entries')}`,
        '',
        '',
        '',
        hours(entries.reduce((sum, p) => sum + p.minutes, 0)),
        '',
        money(total),
        '',
      ],
    });

  const generate = () =>
    confirm({
      title: `Generate ${plural(readyCount, 'invoice')}?`,
      text: `Creates drafts for ${listOf([
        ...readyMatters.map((m) => `${m.short} (${money(m.unbilledCents ?? 0)})`),
        ...installments.map(
          (p) =>
            `${matterById.get(p.invoice.matterId)?.short ?? p.invoice.clientName} (plan ${p.next} of ${p.count}, ${money(p.amountCents)})`,
        ),
      ])}. Nothing is sent until you review each draft.`,
      cta: `Generate ${plural(readyCount, 'draft')}`,
      onConfirm: async () => {
        const before = invoices.data?.length ?? 0;
        const undos = [
          ...readyMatters.map((m) => writes.approvePrebill(m.id)),
          writes.generateInvoices(matterId),
        ];
        const fresh = await invoices.refetch();
        const created = Math.max(0, (fresh.data?.length ?? before) - before);
        notify(`${plural(created, 'draft invoice')} created`, 'Undo', () =>
          undos.reverse().forEach((undo) => undo()),
        );
        router.push('/billing/invoices');
      },
    });

  // ── Invoices ────────────────────────────────────────────────────────────
  const allInvoices = (invoices.data ?? []).filter((i) => !matterId || i.matterId === matterId);
  const chipStatus = (i: Invoice) =>
    i.status === 'partial' ? 'Sent' : i.status[0]!.toUpperCase() + i.status.slice(1);
  const invoiceRows = allInvoices.filter(
    (i) =>
      (status === 'All' || chipStatus(i) === status) &&
      (!query ||
        `${i.number} ${i.clientName} ${i.matterTitle}`.toLowerCase().includes(query.toLowerCase())),
  );
  const invoiceCounts: Record<string, number> = { All: allInvoices.length };
  for (const i of allInvoices)
    invoiceCounts[chipStatus(i)] = (invoiceCounts[chipStatus(i)] ?? 0) + 1;
  // Receivables are firm aggregates shared with Today; session writes move them through the matters.
  const sumOutstanding = (ms: Matter[]) => ms.reduce((s, m) => s + m.outstandingCents, 0);
  const outstanding =
    TODAY_METRICS.outstandingCents + sumOutstanding(matters.data ?? []) - sumOutstanding(MATTERS);
  const sumOverdue = (list: Invoice[]) =>
    list.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balanceCents, 0);
  const overdue =
    TODAY_METRICS.overdueCents + sumOverdue(invoices.data ?? []) - sumOverdue(INVOICES);
  const sumPayments = (list: { amountCents: number }[]) =>
    list.reduce((s, p) => s + p.amountCents, 0);
  const collected =
    TODAY_METRICS.collectedMtdCents + sumPayments(payments.data ?? []) - sumPayments(PAYMENTS);
  const paymentCount =
    BILLING_METRICS.paymentsMtd + (payments.data?.length ?? PAYMENTS.length) - PAYMENTS.length;

  const subtitle =
    tab === 'prebill'
      ? `Pre-bill review · September · ${plural(entries.length, 'entry', 'entries')} · ${plural(groupIds.length, 'matter')} · ${readyCount} ready to invoice`
      : tab === 'invoices'
        ? `${plural(allInvoices.length, 'invoice')} · ${money(outstanding)} outstanding · ${money(overdue)} overdue`
        : `September · ${moneyShort(collected)} received · ${plural(paymentCount, 'payment')}`;

  return (
    <QueryGate routeKey="billing" queries={[prebill, matters, invoices, payments, settings]}>
      <DrawerLayout
        header={
          <div className="cl-pagehead">
            <div>
              <h1>Billing</h1>
              <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
                {subtitle}
              </div>
            </div>
            <div className="cl-pagehead__actions">
              <SegmentedControl
                value={tab}
                onChange={(v) => router.push(`/billing/${v}`)}
                items={[
                  { value: 'prebill', label: 'Pre-bill' },
                  { value: 'invoices', label: 'Invoices' },
                  { value: 'payments', label: 'Payments' },
                ]}
              />
              {tab === 'prebill' ? (
                <>
                  <Button
                    onClick={() =>
                      notify(`LEDES 1998B export ready · ${plural(groupIds.length, 'matter')}`)
                    }
                  >
                    Export LEDES
                  </Button>
                  <Button
                    variant="primary"
                    icon="receipt"
                    disabled={!readyCount}
                    onClick={generate}
                  >
                    Generate {plural(readyCount, 'invoice')}
                  </Button>
                </>
              ) : tab === 'invoices' ? (
                <Button
                  variant="primary"
                  icon="plus"
                  onClick={() => router.push('/billing/prebill')}
                >
                  New invoice
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon="dollar"
                  onClick={() => openForm({ kind: 'payment' })}
                >
                  Record payment
                </Button>
              )}
            </div>
          </div>
        }
        drawer={
          tab === 'prebill' && selected ? (
            <>
              <div className="cl-spread">
                <span className="cl-t-caption cl-muted">
                  {fmtDate(selected.date)} · {selected.timekeeper} · <Mono>{selected.code}</Mono>
                </span>
                <Button
                  variant="ghost"
                  iconOnly
                  icon="x"
                  aria-label="Close entry drawer"
                  onClick={() => select(null)}
                />
              </div>
              <div>
                <h2 className="cl-t-title-3">{matterById.get(selected.matterId)?.title}</h2>
                <div className="cl-t-caption cl-muted" style={{ marginTop: 2 }}>
                  <Mono>{matterById.get(selected.matterId)?.number}</Mono> ·{' '}
                  {matterById.get(selected.matterId)?.billingLabel}
                </div>
              </div>
              <div className="cl-form">
                <Field label="Narrative">
                  <Textarea
                    aria-label="Narrative"
                    key={`${selected.id}-${selected.narrative}`}
                    defaultValue={selected.narrative}
                    minHeight={110}
                    onBlur={(e) => {
                      if (e.target.value.trim()) patch(selected, { narrative: e.target.value });
                      else {
                        e.target.value = selected.narrative;
                        notify('Enter a narrative before saving.');
                      }
                    }}
                  />
                  {aiEnabled && selected.ai && !selected.aiDismissed && selected.aiText ? (
                    <AiSuggestion
                      label="AI cleanup · suggested"
                      text={selected.aiText}
                      actions={[
                        {
                          label: 'Use this',
                          onClick: () => {
                            patch(selected, { narrative: selected.aiText!, aiDismissed: true });
                            notify('Suggested narrative applied');
                          },
                        },
                        {
                          label: 'Keep mine',
                          quiet: true,
                          onClick: () => patch(selected, { aiDismissed: true }),
                        },
                      ]}
                    />
                  ) : null}
                </Field>
                <FormRow>
                  <Field
                    label={
                      <>
                        Hours
                        {selected.originalMinutes ? (
                          <span className="opt" style={{ marginLeft: 8 }}>
                            was {hours(selected.originalMinutes)}
                          </span>
                        ) : null}
                      </>
                    }
                  >
                    {selected.flatCents === null ? (
                      <Stepper
                        className="app-duration-stepper"
                        value={hours(selected.minutes)}
                        onDecrement={() => writes.adjustPrebillMinutes(selected.id, -6)}
                        onIncrement={() => writes.adjustPrebillMinutes(selected.id, 6)}
                      />
                    ) : (
                      <Input aria-label="Hours" value="flat" readOnly />
                    )}
                  </Field>
                  <Field label="Rate">
                    <Input
                      aria-label="Rate"
                      value={((selected.flatCents ?? selected.rateCents) / 100).toLocaleString(
                        'en-US',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                      prefix="$"
                      readOnly
                    />
                  </Field>
                </FormRow>
                <Field label="Write-down reason" optional>
                  <NativeSelect
                    label="Write-down reason"
                    value={selected.reason ?? 'None'}
                    className={selected.reason ? undefined : 'cl-muted'}
                    onChange={(v) => patch(selected, { reason: v === 'None' ? null : v })}
                    options={WRITE_DOWN_REASONS.map((r) => ({ value: r, label: r }))}
                  />
                </Field>
                <KpiTile
                  className="app-prebill-line-total"
                  label="Line total"
                  value={money(prebillAmount(selected))}
                  delta={
                    selected.originalMinutes && selected.originalMinutes > selected.minutes
                      ? `written down ${money(
                          Math.round(
                            ((selected.originalMinutes - selected.minutes) * selected.rateCents) /
                              60,
                          ),
                        )}`
                      : selected.tracked
                        ? 'flat fee · tracked only'
                        : 'at standard rate'
                  }
                />
                <div className="cl-option" style={{ padding: '4px 0' }}>
                  <span className="cl-t-body-sm">Include on invoice</span>
                  <Switch
                    label="Include on invoice"
                    checked={!selected.excluded && !selected.noCharge && !selected.tracked}
                    onChange={(checked) => patch(selected, { excluded: !checked })}
                  />
                </div>
              </div>
              <div className="cl-btn-row" style={{ marginTop: 'auto' }}>
                <Button
                  onClick={() => {
                    const undo = patch(selected, { noCharge: true });
                    notify('Entry marked no charge', 'Undo', undo);
                  }}
                >
                  No charge
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const amount = prebillAmount(selected);
                    const undo = patch(selected, { approved: true, aiDismissed: true });
                    notify(`Approved · ${money(amount)}`, 'Undo', undo);
                    select(null);
                  }}
                >
                  Approve entry
                </Button>
              </div>
            </>
          ) : null
        }
      >
        {tab === 'prebill' ? (
          <>
            <div className="cl-grid-4">
              <KpiTile label="Unbilled" value={moneyShort(unbilled)} delta="at standard rates" />
              <KpiTile
                label="Write-downs"
                value={<span style={{ color: 'var(--warning-ink)' }}>−{money(writeDown)}</span>}
                delta={`${((writeDown / Math.max(1, unbilled)) * 100).toFixed(1)}% · ${plural(
                  writtenDown.length,
                  'entry',
                  'entries',
                )}`}
              />
              <KpiTile
                label="Ready to invoice"
                value={moneyShort(readyCents)}
                delta={`${plural(readyCount, 'matter')} approved`}
                deltaTone="up"
                deltaIcon="check"
              />
              <KpiTile
                label="Trust to apply"
                value={moneyShort(BILLING_METRICS.trustToApplyCents)}
                delta="where retainers allow"
              />
            </div>
            {suggestions.length ? (
              <Banner
                compact
                tone="outline"
                icon="pen"
                title={`${suggestions.length} narratives have AI cleanup suggestions · none applied`}
                trailing={
                  <Button onClick={() => select(suggestions[0]!.id)}>Review suggestions</Button>
                }
              />
            ) : null}
            {matterId ? (
              <Toolbar>
                <Chip active>{matterById.get(matterId)?.short ?? 'Matter'}</Chip>
                <Button variant="ghost" size="sm" onClick={() => router.push('/billing/prebill')}>
                  All matters
                </Button>
              </Toolbar>
            ) : null}
            <Table
              compact
              columns={[
                {
                  key: 'include',
                  header: (
                    <Checkbox
                      shape="square"
                      label="Include all entries"
                      checked={allIncluded}
                      disabled={!includable.length}
                      onChange={(checked) =>
                        includable
                          .filter((p) => p.excluded === checked)
                          .forEach((p) => patch(p, { excluded: !checked }))
                      }
                    />
                  ),
                  width: 36,
                },
                { key: 'date', header: 'Date' },
                { key: 'who', header: 'Timekeeper' },
                { key: 'narrative', header: 'Narrative', width: '40%' },
                { key: 'code', header: 'Code' },
                { key: 'hours', header: 'Hours', align: 'right' },
                { key: 'rate', header: 'Rate', align: 'right' },
                { key: 'amount', header: 'Amount', align: 'right' },
                { key: 'status', header: '' },
              ]}
              rows={rows}
            />
          </>
        ) : null}
        {tab === 'invoices' ? (
          <>
            <div className="cl-grid-4">
              <KpiTile
                label="Outstanding"
                value={moneyShort(outstanding)}
                delta={`${moneyShort(overdue)} overdue`}
                deltaTone="down"
                deltaIcon="alert"
              />
              <KpiTile
                label="Collected · MTD"
                value={moneyShort(collected)}
                delta={`${TODAY_METRICS.collectedDeltaPct}% vs Aug`}
                deltaTone="up"
                deltaIcon="arrow-up-right"
              />
              <KpiTile
                label="Days to paid"
                value={TODAY_METRICS.daysToPaid}
                delta="text-to-pay median"
              />
              <div className="cl-kpi">
                <span className="cl-kpi__label">AR aging</span>
                <StackedBar
                  style={{ marginTop: 10 }}
                  segments={[
                    {
                      label: 'Current',
                      value: TODAY_METRICS.arAging.currentCents,
                      display: moneyShort(TODAY_METRICS.arAging.currentCents),
                      step: 2,
                    },
                    { label: '>30d', value: overdue, display: moneyShort(overdue), step: 6 },
                  ]}
                />
              </div>
            </div>
            <Toolbar>
              <div style={{ width: 240 }}>
                <Input
                  search
                  icon="search"
                  aria-label="Search invoices"
                  placeholder="Search invoices"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {['All', 'Overdue', 'Sent', 'Draft', 'Paid'].map((s) => (
                <Chip
                  key={s}
                  active={status === s}
                  count={invoiceCounts[s] ?? 0}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Chip>
              ))}
            </Toolbar>
            <InvoiceTable invoices={invoiceRows} />
          </>
        ) : null}
        {tab === 'payments' ? (
          <>
            <div className="cl-grid-4">
              <KpiTile
                label="Received · Sep"
                value={moneyShort(collected)}
                delta={plural(paymentCount, 'payment')}
                tint
              />
              <KpiTile
                label="ACH"
                value={`${BILLING_METRICS.achPct}%`}
                delta={`fee-free · ${moneyShort(BILLING_METRICS.achCents)}`}
              />
              <KpiTile
                label="Card"
                value={`${BILLING_METRICS.cardPct}%`}
                delta={`${moneyShort(BILLING_METRICS.cardCents)} · fees passed through`}
              />
              <KpiTile
                label="Payment plans"
                value={BILLING_METRICS.paymentPlans}
                delta="all current"
              />
            </div>
            <Table
              compact
              columns={[
                { key: 'date', header: 'Date' },
                { key: 'payer', header: 'Payer' },
                { key: 'invoice', header: 'Invoice' },
                { key: 'method', header: 'Method' },
                { key: 'matter', header: 'Applied to' },
                { key: 'amount', header: 'Amount', align: 'right' },
                { key: 'status', header: 'Status' },
              ]}
              rows={(payments.data ?? []).map((p) => ({
                id: p.id,
                strong: [5],
                cells: [
                  fmtDate(p.date),
                  <span key="payer" className="cell-title">
                    {p.payer}
                  </span>,
                  <Mono key="invoice">{p.invoiceNumber}</Mono>,
                  p.method,
                  <span key="applied" className="cl-muted">
                    {p.appliedTo}
                  </span>,
                  money(p.amountCents),
                  <Pill
                    key="status"
                    tone={
                      p.status === 'Pending'
                        ? 'warning'
                        : p.status === 'Applied'
                          ? 'info'
                          : 'success'
                    }
                  >
                    {p.status}
                  </Pill>,
                ],
              }))}
            />
          </>
        ) : null}
      </DrawerLayout>
    </QueryGate>
  );
}
