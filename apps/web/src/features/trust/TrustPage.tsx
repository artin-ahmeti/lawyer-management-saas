'use client';

import {
  Banner,
  Button,
  CellTitle,
  KpiTile,
  Mono,
  Pill,
  SectionHeader,
  Table,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { Page, QueryGate } from '@/components/PageState';
import { useMatters, useTrustRecent, useSettings, useWrites } from '@/lib/data';
import { todayIso } from '@/lib/clock';
import { fmtDate, fmtDateWeekday, money, plural } from '@/lib/format';
import { csv, downloadFile } from '@/lib/download';
import { useOverlays } from '@/stores/ui';

/** The Alvarez settlement: Rule 1.15 notice and accounting due 14 days after receipt. */
const NOTICE = {
  matterId: 'm1',
  client: 'Sofia Alvarez',
  short: 'Alvarez',
  matter: 'Alvarez v. Meridian',
  receivedAt: '2026-09-18',
  dueAt: '2026-10-02',
  disburseBy: '2026-11-02',
  amountCents: 4200000,
};
const NEXT_RECONCILIATION_DUE = '2026-10-10';

/** "+$42,000.00" · "−$1,760.00" with a real minus sign. */
const signedMoney = (cents: number) => `${cents < 0 ? '−' : '+'}${money(Math.abs(cents))}`;

export function TrustPage() {
  const matters = useMatters();
  const activity = useTrustRecent();
  const settings = useSettings();
  const { patchSettings } = useWrites();
  const open = useOverlays((s) => s.openForm);
  const confirm = useOverlays((s) => s.confirm);
  const notify = useOverlays((s) => s.notify);
  const ledgers = (matters.data ?? []).filter((m) => m.trustCents !== null && m.trustCents > 0);
  const balance = ledgers.reduce((s, m) => s + (m.trustCents ?? 0), 0);
  const noticeSent = settings.data?.noticeSent ?? false;
  const reconciledAt = settings.data?.reconciledAt ?? null;
  const reconciledThisMonth = !!reconciledAt && reconciledAt.slice(0, 7) === todayIso().slice(0, 7);
  const noticeDue = fmtDateWeekday(NOTICE.dueAt);
  const reconcile = () =>
    confirm({
      title: 'Reconcile September?',
      text: `Bank ${money(balance)} · client ledgers ${money(balance)} · book ${money(balance)}. All three match. Signing locks September transactions and files the report to the audit trail.`,
      cta: 'Sign reconciliation',
      onConfirm: () => {
        const undo = patchSettings({ reconciledAt: todayIso() });
        notify('September reconciled · signed by Dana Okafor', 'Undo', undo);
      },
    });
  const sendNotice = () => {
    const undo = patchSettings({ noticeSent: true });
    notify(`14-day notice sent to ${NOTICE.client} · docket updated`, 'Undo', undo);
  };
  const exportLedger = () =>
    downloadFile(
      'clepso-trust-ledger.csv',
      csv([
        ['Date', 'Description', 'Amount cents'],
        ...(activity.data ?? []).map((a) => [a.date, a.description, a.amountCents]),
      ]),
    );
  return (
    <QueryGate routeKey="trust" queries={[matters, activity, settings]}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Trust</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              IOLTA ····4821 · First Republic · {plural(ledgers.length, 'client ledger')}
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <Button
              icon="download"
              onClick={() => notify('Audit pack generating · PDF + CSV to your inbox')}
            >
              Audit pack
            </Button>
            <Button onClick={() => open({ kind: 'deposit' })}>Record deposit</Button>
            <Button variant="primary" icon="check" onClick={reconcile}>
              Reconcile September
            </Button>
          </div>
        </div>
        <div className="cl-grid-4">
          <KpiTile
            label="Bank balance"
            value={money(balance)}
            delta={`as of ${fmtDate(todayIso())}`}
          />
          <KpiTile
            label="Client ledgers"
            value={money(balance)}
            delta="3-way match"
            deltaTone="up"
            deltaIcon="check"
          />
          <KpiTile
            label="Last reconciled"
            value={
              <span style={{ fontSize: 20 }}>{reconciledAt ? fmtDate(reconciledAt) : '—'}</span>
            }
            delta={
              reconciledThisMonth
                ? 'September signed · October due Nov 10'
                : `September due ${fmtDate(NEXT_RECONCILIATION_DUE)}`
            }
          />
          <KpiTile
            label="Notices due"
            value={noticeSent ? 0 : 1}
            delta={
              noticeSent ? (
                'none outstanding'
              ) : (
                <span style={{ color: 'var(--warning-ink)' }}>
                  14-day · {NOTICE.short} · {noticeDue.replace(',', '')}
                </span>
              )
            }
          />
        </div>
        {!noticeSent ? (
          <Banner
            tone="warning"
            icon="lock"
            style={{ alignItems: 'flex-start' }}
            title={`Rule 1.15 · 14-day notice for ${NOTICE.matter} due ${noticeDue}`}
            text={`${money(NOTICE.amountCents)} settlement funds received ${fmtDate(NOTICE.receivedAt)}. The client notice and accounting must go out within 14 days; disbursement window closes ${fmtDate(NOTICE.disburseBy)}.`}
            actions={
              <>
                <Button variant="primary" onClick={sendNotice}>
                  Send notice to {NOTICE.client}
                </Button>
                <Link
                  href={`/matters/${NOTICE.matterId}?tab=Trust`}
                  className="cl-btn cl-btn--ghost"
                >
                  Preview
                </Link>
              </>
            }
          />
        ) : (
          <Banner
            compact
            tone="success"
            icon="check"
            title={`14-day notice sent to ${NOTICE.client} · docket updated`}
          />
        )}
        <div className="cl-cols cl-cols--2">
          <div>
            <SectionHeader title="Client ledgers" />
            <Table
              compact
              columns={[
                { key: 'matter', header: 'Matter' },
                { key: 'client', header: 'Client' },
                { key: 'balance', header: 'Balance', align: 'right' },
                { key: 'status', header: 'Status' },
              ]}
              rows={[
                ...ledgers.map((m) => {
                  const due = m.id === NOTICE.matterId && !noticeSent;
                  return {
                    id: m.id,
                    strong: [2],
                    cells: [
                      <CellTitle
                        key="matter"
                        title={<Link href={`/matters/${m.id}?tab=Trust`}>{m.title}</Link>}
                        sub={<Mono>{m.number}</Mono>}
                      />,
                      m.clientName,
                      money(m.trustCents ?? 0),
                      <Pill key="status" tone={due ? 'warning' : 'success'} dot>
                        {due ? 'Notice due' : 'Reconciled'}
                      </Pill>,
                    ],
                  };
                }),
                {
                  id: 'total',
                  kind: 'foot' as const,
                  cells: [plural(ledgers.length, 'ledger'), '', money(balance), ''],
                },
              ]}
            />
          </div>
          <div>
            <SectionHeader title="Recent activity" action="Full ledger" onAction={exportLedger} />
            <Table
              compact
              columns={[
                { key: 'date', header: 'Date', width: 72 },
                { key: 'description', header: 'Description' },
                { key: 'amount', header: 'Amount', align: 'right', width: 128 },
              ]}
              rows={(activity.data ?? []).map((a, i) => ({
                id: `${a.date}-${i}`,
                strong: a.amountCents === null ? [] : [2],
                cells: [
                  fmtDate(a.date),
                  <span
                    key="description"
                    className="cl-truncate"
                    title={a.description}
                    style={{ display: 'block', width: 0, minWidth: '100%' }}
                  >
                    {a.description}
                  </span>,
                  a.amountCents === null ? (
                    <span key="amount" className="cl-muted">
                      —
                    </span>
                  ) : (
                    <span
                      key="amount"
                      style={{ color: a.amountCents > 0 ? 'var(--success-ink)' : undefined }}
                    >
                      {signedMoney(a.amountCents)}
                    </span>
                  ),
                ],
              }))}
            />
          </div>
        </div>
      </Page>
    </QueryGate>
  );
}
