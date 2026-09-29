import {
  Amount,
  Button,
  Card,
  Columns,
  KeyValue,
  List,
  ListRow,
  Mono,
  Pill,
  RowSep,
  Spread,
  Stack,
  Text,
  TimeBlock,
} from '@lawfirm/ui-web';

export const Main = () => (
  <div className="cl-web">
    <Columns layout="main">
      <Card
        title="Review your day"
        subtitle="3 things you probably billed for · +0.9h"
        headerAction={
          <Button variant="secondary" size="sm">
            Bill all
          </Button>
        }
      >
        <List flat>
          <ListRow
            lead={<TimeBlock main="10:12" sub="AM" />}
            regular
            title="Call · Sofia Alvarez · 12 min"
            subtitle="Alvarez v. Meridian"
            value="0.2h"
          />
          <ListRow
            lead={<TimeBlock main="11:40" sub="AM" />}
            regular
            title="Email · Kessler board deck"
            subtitle="Kessler — Series B"
            value="0.3h"
          />
          <ListRow
            lead={<TimeBlock main="2:05" sub="PM" />}
            regular
            title="Draft inventory schedules"
            subtitle="Estate of Bennett"
            value="0.4h"
          />
        </List>
      </Card>
      <Card title="Who to nudge" subtitle="$8,125.00 overdue · $25,000.00 due in 10 days">
        <List flat>
          <ListRow
            title="Margaret Bennett"
            subtitle={
              <>
                <Mono>INV-2026-078</Mono> <RowSep /> 46 days
              </>
            }
            value="$8,125.00"
            pill={
              <Pill tone="danger" dot>
                Overdue
              </Pill>
            }
          />
          <ListRow
            title="Kessler Holdings"
            subtitle={
              <>
                <Mono>INV-2026-092</Mono> <RowSep /> Due Oct 9
              </>
            }
            value="$25,000.00"
            pill={<Pill tone="info">Sent</Pill>}
          />
        </List>
      </Card>
    </Columns>
  </div>
);

export const SidebarLayout = () => (
  <div className="cl-web">
    <Columns layout="sidebar">
      <List>
        <ListRow
          title="Estate of Harold Bennett"
          subtitle={
            <>
              Margaret Bennett <RowSep /> Probate <RowSep /> <Mono>2026-0187</Mono>
            </>
          }
          pill={
            <Pill tone="warning" dot>
              Filing in 4d
            </Pill>
          }
          meta="$4,825.00 unbilled"
          selected
          pressable
        />
        <ListRow
          title="Alvarez v. Meridian Logistics"
          subtitle={
            <>
              Sofia Alvarez <RowSep /> Personal injury <RowSep /> <Mono>2026-0142</Mono>
            </>
          }
          pill={<Pill tone="accent">Discovery</Pill>}
          meta="Cutoff Oct 24"
          pressable
        />
        <ListRow
          title="Kessler Holdings — Series B"
          subtitle={
            <>
              Corporate <RowSep /> Flat fee <RowSep /> <Mono>2026-0201</Mono>
            </>
          }
          pill={<Pill>Closing</Pill>}
          meta="$25,000.00 due Oct 9"
          pressable
        />
        <ListRow
          title="People v. Marcus Webb"
          subtitle={
            <>
              Criminal defense <RowSep /> <Mono>2026-0119</Mono>
            </>
          }
          pill={
            <Pill tone="info" icon="gavel">
              Court
            </Pill>
          }
          meta="Pretrial Sep 29"
          pressable
        />
      </List>
      <Card
        title="Estate of Harold Bennett"
        subtitle={<Mono>2026-0187</Mono>}
        headerAction={<Pill tone="accent">Open</Pill>}
      >
        <Stack gap="lg" style={{ marginTop: 12 }}>
          <KeyValue
            items={[
              { label: 'Client', value: 'Margaret Bennett' },
              { label: 'Practice', value: 'Probate' },
              { label: 'Lead', value: 'Lisa Tran' },
              { label: 'Billing', value: 'Hourly · $325.00' },
              { label: 'Opened', value: 'Jun 3, 2026' },
            ]}
          />
          <Spread>
            <Text variant="label" tone="muted">
              Unbilled
            </Text>
            <Amount cents={482500} />
          </Spread>
          <Button variant="primary">Log time</Button>
        </Stack>
      </Card>
    </Columns>
  </div>
);
