import { Amount, Card, List, ListRow, Mono, Pill, RowSep } from '@lawfirm/ui-web';

export const LineItemsWithTotal = () => (
  <div style={{ maxWidth: 358 }}>
    <List
      footer={
        <>
          <span>Total</span>
          <Amount cents={812500} />
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
      <ListRow regular title="Filing fees & appraisal" subtitle="Costs advanced" value="$3,737.50" />
    </List>
  </div>
);

export const PayLinkFooter = () => (
  <div style={{ maxWidth: 358 }}>
    <List
      footer={
        <>
          <span>Pay link · texted Sep 12 · opened Sep 13</span>
          <button type="button" className="cl-link">
            Resend
          </button>
        </>
      }
    >
      <ListRow
        title="Margaret Bennett"
        subtitle={
          <>
            <Mono>INV-2026-078</Mono> <RowSep /> Estate of Bennett
          </>
        }
        value="$8,125.00"
        pill={
          <Pill tone="danger" dot>
            Overdue 46d
          </Pill>
        }
        pressable
      />
      <ListRow
        title="Kessler Holdings LLC"
        subtitle={
          <>
            <Mono>INV-2026-092</Mono> <RowSep /> Series B · flat fee
          </>
        }
        value="$25,000.00"
        pill={<Pill tone="info">Sent · due Oct 9</Pill>}
        pressable
      />
    </List>
  </div>
);

export const FlatInsideCard = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      title="Unbilled time"
      subtitle="Estate of Harold Bennett · 2026-0187"
      headerAction={<Pill tone="accent">4.4h</Pill>}
    >
      <List flat>
        <ListRow
          regular
          title="Draft inventory schedules"
          subtitle={
            <>
              Sep 29 <RowSep /> <Mono>L110</Mono> <RowSep /> 1.6h
            </>
          }
          value="$520.00"
        />
        <ListRow
          regular
          title="Call with Margaret re: appraisal"
          subtitle={
            <>
              Sep 26 <RowSep /> <Mono>L120</Mono> <RowSep /> 0.4h
            </>
          }
          value="$130.00"
        />
        <ListRow
          regular
          title="Review creditor claims"
          subtitle={
            <>
              Sep 24 <RowSep /> <Mono>L110</Mono> <RowSep /> 2.4h
            </>
          }
          value="$780.00"
        />
      </List>
    </Card>
  </div>
);
