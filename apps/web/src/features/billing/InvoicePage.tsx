'use client';

import {
  Banner,
  Button,
  Card,
  Icon,
  Mono,
  Pill,
  Table,
  Timeline,
  type IconName,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { Page, PageEmpty, QueryGate } from '@/components/PageState';
import { invoiceTone } from '@/components/DataTables';
import { useInvoice, useSettings, useWrites } from '@/lib/data';
import { todayIso } from '@/lib/clock';
import { fmtDate, money, moneyOrDash } from '@/lib/format';
import { useOverlays } from '@/stores/ui';

const TRUST_ACCOUNT = 'IOLTA ····4821';

export function InvoicePage({ id }: { id: string }) {
  const invoice = useInvoice(id);
  const settings = useSettings();
  const writes = useWrites();
  const notify = useOverlays((s) => s.notify);
  const confirm = useOverlays((s) => s.confirm);
  const openForm = useOverlays((s) => s.openForm);
  const i = invoice.data;
  const isDraft = i?.status === 'draft';
  const isPaid = !!i && i.balanceCents <= 0;
  const canText = !!i && !isDraft && !isPaid;
  const emailInvoice = () => i && notify(`Invoice ${i.number} emailed to ${i.clientName}`);
  const send = () => {
    if (!i) return;
    confirm({
      title: `Send ${i.number} for ${money(i.totalCents)}?`,
      text: `Emails the invoice to ${i.clientName} with a pay link (ACH first). Terms ${i.terms}. You can void it within 24 hours.`,
      cta: `Send for ${money(i.totalCents)}`,
      onConfirm: () => {
        const undo = writes.sendInvoice(id);
        notify(`${i.number} sent · ${money(i.totalCents)}`, 'Undo', undo);
      },
    });
  };
  const recordPayment = () => {
    if (!i) return;
    confirm({
      title: `Record payment on ${i.number}?`,
      text: `Marks ${money(i.balanceCents)} received from ${i.clientName} by ACH today and closes the invoice. A receipt is texted and emailed to the client.`,
      cta: `Record ${money(i.balanceCents)}`,
      onConfirm: () => {
        const undo = writes.recordPayment({
          invoiceId: id,
          amountCents: i.balanceCents,
          method: 'ACH',
          date: todayIso(),
        });
        notify(`Payment received · ${money(i.balanceCents)} from ${i.clientName}`, 'Undo', undo);
      },
    });
  };
  const textPayLink = () => {
    if (!i) return;
    confirm({
      title: `Text pay link to ${i.clientName}?`,
      text: `Sends a secure link for ${i.number} · ${money(i.balanceCents)} to ${i.contact}. ACH is offered first; card adds a 2.9% fee they can see before paying.`,
      cta: 'Text pay link',
      onConfirm: () => {
        const undo = writes.textPayLink(id);
        notify(`Pay link texted to ${i.clientName} · ${money(i.balanceCents)}`, 'Undo', undo);
      },
    });
  };
  const linkStatus = !i
    ? '—'
    : isPaid
      ? 'Paid via ACH'
      : i.payLink === 'texted'
        ? 'Texted today · not opened'
        : i.payLink === 'opened'
          ? 'Opened Sep 13'
          : i.status === 'sent' && i.activity[0]?.when === 'Today'
            ? 'Emailed today'
            : '—';
  return (
    <QueryGate routeKey="invoice" queries={[invoice]}>
      {!i ? (
        <PageEmpty
          routeKey="invoice"
          action={
            <Link href="/billing/invoices" className="cl-btn cl-btn--primary">
              All invoices
            </Link>
          }
        />
      ) : (
        <Page className="app-invoice" style={{ gap: 20 }}>
          <div className="app-invoice-print-heading">
            <h2>{settings.data?.firm.name ?? 'Clepso'}</h2>
            <p>{settings.data?.firm.address}</p>
          </div>
          <div>
            <div className="cl-crumbs">
              <Link href="/billing/invoices" style={{ color: 'inherit' }}>
                Billing
              </Link>
              <Icon name="chevron-right" />
              <Link href="/billing/invoices" style={{ color: 'inherit' }}>
                Invoices
              </Link>
              <Icon name="chevron-right" />
              <b>{i.number}</b>
            </div>
            <div className="cl-pagehead" style={{ marginTop: 8 }}>
              <div>
                <div className="cl-inline" style={{ gap: 10, marginBottom: 4 }}>
                  <Mono ink className="app-invoice-number">
                    {i.number}
                  </Mono>
                  <Pill tone={invoiceTone(i)} dot={i.status !== 'draft' && i.status !== 'sent'}>
                    {i.statusLabel}
                  </Pill>
                </div>
                <h1>{i.clientName}</h1>
                <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
                  <Link href={`/matters/${i.matterId}?tab=Billing`} style={{ color: 'inherit' }}>
                    {i.matterTitle}
                  </Link>{' '}
                  · issued {fmtDate(i.issuedAt)} · due {fmtDate(i.dueAt)} · {i.terms}
                </div>
              </div>
              <div className="cl-pagehead__actions">
                <Button icon="send" onClick={emailInvoice}>
                  Email invoice
                </Button>
                {!isDraft && !isPaid ? (
                  <Button icon="dollar" onClick={recordPayment}>
                    Record payment
                  </Button>
                ) : null}
                {canText ? (
                  <Button variant="primary" icon="message" onClick={textPayLink}>
                    Text pay link
                  </Button>
                ) : null}
                {isDraft ? (
                  <Button variant="primary" icon="send" onClick={send}>
                    Send for {money(i.totalCents)}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  iconOnly
                  icon="more"
                  aria-label="More · print or save as PDF"
                  title="Print or save as PDF"
                  onClick={() => window.print()}
                />
              </div>
            </div>
          </div>
          {i.banner && !isPaid ? (
            <Banner
              tone={i.banner.tone}
              icon={i.banner.icon as IconName}
              title={i.banner.title}
              text={i.banner.text}
              style={{ alignItems: 'flex-start' }}
            />
          ) : null}
          <div className="cl-cols cl-cols--sidebar">
            <div className="cl-stack cl-stack--lg">
              <Card flush style={{ overflow: 'hidden' }}>
                <div
                  className="cl-spread app-invoice-balances"
                  style={{
                    alignItems: 'flex-end',
                    padding: '20px 22px 16px',
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  <div>
                    <div className="cl-t-label cl-muted">Balance due</div>
                    <div className="cl-amount cl-amount--display" style={{ marginTop: 2 }}>
                      {money(i.balanceCents)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cl-t-label cl-muted">Total</div>
                    <div className="cl-amount cl-amount--lg">{money(i.totalCents)}</div>
                  </div>
                </div>
                <Table
                  compact
                  className="app-invoice-lines"
                  columns={[
                    { key: 'date', header: 'Date', width: '10%' },
                    { key: 'who', header: 'Timekeeper', width: '13%' },
                    { key: 'description', header: 'Description', width: '44%' },
                    { key: 'hours', header: 'Hours', align: 'right', width: '8%' },
                    { key: 'rate', header: 'Rate', align: 'right', width: '11%' },
                    { key: 'amount', header: 'Amount', align: 'right', width: '14%' },
                  ]}
                  rows={[
                    ...i.lines.map((l, n) => ({
                      id: String(n),
                      strong: [5],
                      cells: [
                        fmtDate(l.date),
                        l.timekeeper,
                        <span
                          key="description"
                          className="cl-truncate app-invoice-description"
                          title={l.description}
                          style={{ width: 0, minWidth: '100%' }}
                        >
                          {l.description}
                        </span>,
                        l.hours?.toFixed(1) ?? '—',
                        l.rateCents === null ? 'flat' : moneyOrDash(l.rateCents),
                        money(l.amountCents),
                      ],
                    })),
                    {
                      id: 'fees',
                      kind: 'foot' as const,
                      cells: [`Fees ${i.feeHoursLabel}`.trim(), '', '', '', '', money(i.feesCents)],
                    },
                    {
                      id: 'expenses',
                      cells: [
                        <span key="label" className="cl-muted">
                          Expenses
                        </span>,
                        '',
                        '',
                        '',
                        '',
                        money(i.expensesCents),
                      ],
                    },
                    {
                      id: 'trust',
                      cells: [
                        <span key="label" className="cl-muted">
                          Applied from trust · {TRUST_ACCOUNT}
                        </span>,
                        '',
                        '',
                        '',
                        '',
                        <span key="amount" style={{ color: 'var(--success-ink)' }}>
                          {money(i.trustAppliedCents)}
                        </span>,
                      ],
                    },
                  ]}
                />
              </Card>
            </div>
            <div className="cl-stack cl-stack--lg app-invoice-activity">
              <Card>
                <div className="cl-t-body-strong" style={{ marginBottom: 12 }}>
                  Payment
                </div>
                <div className="cl-stack cl-stack--sm">
                  <div className="cl-spread">
                    <span className="cl-t-label cl-muted">Pay link</span>
                    <span className="cl-t-label cl-num">{linkStatus}</span>
                  </div>
                  <div className="cl-spread">
                    <span className="cl-t-label cl-muted">Methods</span>
                    <span className="cl-t-label">ACH · card</span>
                  </div>
                  <div className="cl-spread">
                    <span className="cl-t-label cl-muted">Sent to</span>
                    <span className="cl-t-label">{i.contact}</span>
                  </div>
                  <div className="cl-spread">
                    <span className="cl-t-label cl-muted">Terms</span>
                    <span className="cl-t-label">{i.terms}</span>
                  </div>
                </div>
                {!isDraft && !isPaid ? (
                  <>
                    <div className="cl-divider" style={{ margin: '14px 0' }} />
                    <Button block onClick={() => openForm({ kind: 'paymentPlan', invoiceId: id })}>
                      {i.paymentPlan
                        ? `${i.paymentPlan.installments}-installment plan · edit`
                        : 'Offer a payment plan'}
                    </Button>
                  </>
                ) : null}
              </Card>
              <Card>
                <div className="cl-t-body-strong" style={{ marginBottom: 12 }}>
                  Activity
                </div>
                <Timeline
                  events={i.activity.map((a) => ({
                    title: (
                      <>
                        <b>{a.actor}</b> {a.action}
                      </>
                    ),
                    meta: a.when === todayIso() ? 'Today' : a.when,
                    icon: a.icon as IconName,
                    tone: a.accent ? 'accent' : 'default',
                  }))}
                />
              </Card>
            </div>
          </div>
        </Page>
      )}
    </QueryGate>
  );
}
