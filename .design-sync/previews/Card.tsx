import {
  Amount,
  Avatar,
  Button,
  Card,
  IconWell,
  KeyValue,
  List,
  ListRow,
  Mono,
  Pill,
  ProgressBar,
  RowSep,
  Text,
} from '@lawfirm/ui-web';

export const ReviewYourDay = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      flush
      title="Review your day"
      subtitle="3 things you probably billed for"
      headerAction={<Pill tone="accent">+0.9h</Pill>}
    >
      <List flat style={{ padding: '0 16px' }}>
        <ListRow
          lead={<IconWell name="phone" />}
          regular
          title="Call · Sofia Alvarez · 12 min"
          subtitle="Alvarez v. Meridian · 10:12 AM"
          trail={
            <>
              <Button variant="primary" size="sm">
                Bill 0.2h
              </Button>
              <Button variant="ghost" size="sm">
                Skip
              </Button>
            </>
          }
        />
        <ListRow
          lead={<IconWell name="calendar" />}
          regular
          title="Kessler board sync · 1h"
          subtitle="Kessler — Series B · 2:00 PM"
          trail={
            <>
              <Button variant="primary" size="sm">
                Bill 1.0h
              </Button>
              <Button variant="ghost" size="sm">
                Skip
              </Button>
            </>
          }
        />
        <ListRow
          lead={<IconWell name="mic" />}
          regular
          title="Voice memo · “Bennett, point three…”"
          subtitle="Transcribed · 0.3h suggested"
          trail={
            <Button variant="secondary" size="sm">
              Review
            </Button>
          }
        />
      </List>
    </Card>
  </div>
);

export const WhoToNudge = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      flush
      title="Who to nudge"
      subtitle="$8,125.00 overdue · $25,000.00 due in 10 days"
      headerAction={
        <Button variant="tertiary" size="sm">
          All AR
        </Button>
      }
      footer={
        <>
          <Button variant="primary" size="sm" icon="send">
            Text pay link
          </Button>
          <Button variant="secondary" size="sm">
            Offer a plan
          </Button>
        </>
      }
    >
      <List flat style={{ padding: '0 16px' }}>
        <ListRow
          lead={<Avatar name="Margaret Bennett" />}
          title="Margaret Bennett"
          subtitle={
            <>
              <Mono>INV-2026-078</Mono> <RowSep /> pay link opened, not paid
            </>
          }
          value="$8,125.00"
          meta="46 days late"
          metaTone="danger"
        />
        <ListRow
          lead={<Avatar kind="org" initials="KH" />}
          title="Kessler Holdings LLC"
          subtitle={
            <>
              <Mono>INV-2026-092</Mono> <RowSep /> sent Sep 10
            </>
          }
          value="$25,000.00"
          meta="Due Oct 9"
        />
      </List>
    </Card>
  </div>
);

export const TrustBalance = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      headerLead={<IconWell name="lock" tone="accent" />}
      title="Trust · Estate of Bennett"
      subtitle={
        <>
          IOLTA <Mono>····4821</Mono>
        </>
      }
      headerAction={
        <Pill tone="success" dot>
          3-way match
        </Pill>
      }
      footer={
        <>
          <Button variant="secondary" size="sm">
            Ledger
          </Button>
          <Button variant="secondary" size="sm">
            Audit pack
          </Button>
          <Button variant="primary" size="sm">
            Disburse
          </Button>
        </>
      }
    >
      <div style={{ marginTop: 14 }}>
        <Amount value="$18,240.00" size="lg" />
      </div>
      <KeyValue
        style={{ marginTop: 12 }}
        items={[
          { label: 'Reconciled', value: 'Sep 1 · next due Oct 1' },
          { label: 'Last deposit', value: '$2,000.00 · Sep 29 · ACH' },
          { label: 'Pending', value: 'Disbursement $1,200.00 · appraiser' },
        ]}
      />
    </Card>
  </div>
);

export const TrustNotice = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      tone="warning"
      headerLead={<IconWell name="alert" tone="warning" />}
      title="Notice due in 3 days"
      subtitle="Settlement funds received Sep 18 · 14-day client notice"
      footer={
        <>
          <Button variant="primary" size="sm">
            Send notice
          </Button>
          <Button variant="ghost" size="sm">
            View rule
          </Button>
        </>
      }
    >
      <Text variant="label" as="p" style={{ marginTop: 12 }}>
        Cal. Rule 1.15 requires written notice to Sofia Alvarez by <b>Oct 2</b>. A template is
        ready; the 45-day disbursement timer starts on send.
      </Text>
    </Card>
  </div>
);

export const InvoiceSummary = () => (
  <div style={{ maxWidth: 358 }}>
    <Card flush>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="cl-spread">
          <Mono>INV-2026-078</Mono>
          <Pill tone="danger" dot>
            Overdue 46 days
          </Pill>
        </div>
        <div style={{ marginTop: 8 }}>
          <Amount value="$8,125.00" size="display" />
        </div>
        <Text variant="label" tone="muted" as="div">
          Margaret Bennett · Estate of Harold Bennett · due Aug 14
        </Text>
      </div>
      <List
        flat
        style={{ padding: '8px 16px 0' }}
        footer={
          <>
            <span>Pay link · texted Sep 12 · opened Sep 13</span>
            <span className="cl-link">Resend</span>
          </>
        }
      >
        <ListRow
          regular
          title="Draft petition and schedules"
          subtitle="L. Tran · 9.5h × $325.00"
          value="$3,087.50"
        />
        <ListRow
          regular
          title="Court appearance · letters"
          subtitle="L. Tran · 4.0h × $325.00"
          value="$1,300.00"
        />
        <ListRow
          regular
          title="Filing fees & appraisal"
          subtitle="Costs advanced"
          value="$3,737.50"
        />
      </List>
    </Card>
  </div>
);

export const Tones = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack">
    <Card
      tone="tint"
      title="Timer running"
      subtitle="Estate of Bennett · Draft inventory schedules"
      headerAction={<Text variant="mono-timer">1:36:04</Text>}
      footer={
        <>
          <Button variant="secondary" size="sm" icon="pause">
            Pause
          </Button>
          <Button variant="primary" size="sm" icon="stop">
            Stop and bill
          </Button>
        </>
      }
    >
      <div style={{ marginTop: 12 }}>
        <div className="cl-spread">
          <Text variant="label">Billed today</Text>
          <Text variant="label" tone="muted">
            3.4 of 6h
          </Text>
        </div>
        <ProgressBar value={57} />
      </div>
    </Card>
    <Card
      tone="ink"
      title="Collected this month"
      headerAction={
        <Pill tone="success" dot>
          On pace
        </Pill>
      }
    >
      <div style={{ marginTop: 12 }}>
        <Amount value="$12,450.00" size="lg" />
      </div>
      <Text variant="label" as="div" className="cl-muted" style={{ marginTop: 4 }}>
        18% ahead of the prior 30 days · 6.2 days to paid
      </Text>
    </Card>
    <Card tone="raised" title="Payment plan offered" subtitle="Margaret Bennett · INV-2026-078">
      <Text variant="label" as="p" className="cl-muted" style={{ marginTop: 10 }}>
        4 × $2,031.25 · first payment Oct 15 · autopay by ACH
      </Text>
    </Card>
  </div>
);
