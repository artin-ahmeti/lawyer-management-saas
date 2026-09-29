import {
  Avatar,
  Banner,
  Button,
  ButtonRow,
  Checkbox,
  Drawer,
  KeyValue,
  KpiRow,
  KpiTile,
  List,
  ListRow,
  Mono,
  Pill,
  SectionHeader,
  StageTracker,
  Text,
} from '@lawfirm/ui-web';

const panel = {
  width: 380,
  border: '1px solid var(--hairline)',
  borderRadius: 14,
};

export const MatterSummary = () => (
  <div className="cl-web">
    <Drawer style={panel}>
      <div className="cl-spread">
        <Mono>2026-0187</Mono>
        <div className="cl-inline" style={{ gap: 4 }}>
          <Button variant="ghost" iconOnly icon="arrow-up-right" aria-label="Open" />
          <Button variant="ghost" iconOnly icon="x" aria-label="Close" />
        </div>
      </div>
      <div>
        <Text variant="title-3" as="h2">
          Estate of Harold Bennett
        </Text>
        <Text variant="caption" tone="muted" as="div" style={{ marginTop: 2 }}>
          Margaret Bennett · Probate · L. Tran · opened May 2
        </Text>
        <div className="cl-inline" style={{ marginTop: 8 }}>
          <Pill tone="accent">Open</Pill>
          <Pill tone="outline">Hourly · $325</Pill>
        </div>
      </div>
      <StageTracker
        stages={[
          { label: 'Intake', state: 'done' },
          { label: 'Petition', state: 'done' },
          { label: 'Inventory', state: 'current' },
          { label: 'Creditors' },
          { label: 'Close' },
        ]}
      />
      <Banner tone="warning" icon="alert" compact title="Inventory filing due Fri, Oct 3" />
      <KpiRow columns={2}>
        <KpiTile label="Unbilled" value="$4,825" delta="14.8h · 9 entries" />
        <KpiTile label="Trust" value="$18,240" delta="IOLTA ····4821" />
      </KpiRow>
      <div>
        <SectionHeader title="Open tasks" count={4} />
        <List>
          <ListRow
            lead={<Checkbox checked={false} label="Done" />}
            regular
            title="File estate inventory"
            subtitle="L. Tran"
            meta="Oct 3"
            metaTone="warning"
          />
          <ListRow
            lead={<Checkbox checked={false} label="Done" />}
            regular
            title="Confirm appraiser invoice"
            subtitle="D. Okafor"
            meta="Oct 7"
          />
        </List>
      </div>
      <div>
        <SectionHeader title="People" />
        <List>
          <ListRow
            lead={<Avatar size="sm" initials="MB" />}
            title="Margaret Bennett"
            subtitle="Client · executor"
            chevron
            pressable
          />
          <ListRow
            lead={<Avatar size="sm" tone="accent" initials="AP" />}
            title="Dr. Anand Patel"
            subtitle="Appraiser"
            chevron
            pressable
          />
        </List>
      </div>
      <ButtonRow>
        <Button variant="secondary" icon="play">
          Timer
        </Button>
        <Button variant="secondary" icon="message">
          Message
        </Button>
        <Button variant="primary">Invoice</Button>
      </ButtonRow>
    </Drawer>
  </div>
);

export const InvoiceSummary = () => (
  <div className="cl-web">
    <Drawer style={panel}>
      <div className="cl-spread">
        <Mono>INV-2026-078</Mono>
        <div className="cl-inline" style={{ gap: 4 }}>
          <Button variant="ghost" iconOnly icon="arrow-up-right" aria-label="Open" />
          <Button variant="ghost" iconOnly icon="x" aria-label="Close" />
        </div>
      </div>
      <div>
        <Text variant="title-3" as="h2">
          Margaret Bennett
        </Text>
        <Text variant="caption" tone="muted" as="div" style={{ marginTop: 2 }}>
          Estate of Harold Bennett · sent Jul 15 · link opened Sep 13
        </Text>
        <div className="cl-inline" style={{ marginTop: 8 }}>
          <Pill tone="danger" dot>
            Overdue 46d
          </Pill>
          <Pill tone="outline">Net 30</Pill>
        </div>
      </div>
      <KeyValue
        items={[
          { label: 'Amount', value: '$8,125.00' },
          { label: 'Paid', value: '$0.00' },
          { label: 'Balance', value: '$8,125.00' },
          { label: 'Due', value: 'Aug 14' },
        ]}
      />
      <div>
        <SectionHeader title="Reminders" count={2} />
        <List>
          <ListRow
            regular
            title="Pay link texted to (415) 555-0198"
            subtitle="Opened · no payment"
            meta="Sep 13"
          />
          <ListRow regular title="Reminder email" subtitle="Delivered" meta="Sep 22" />
        </List>
      </div>
      <ButtonRow>
        <Button variant="primary" icon="send">
          Text pay link
        </Button>
        <Button variant="secondary">Record payment</Button>
      </ButtonRow>
    </Drawer>
  </div>
);
