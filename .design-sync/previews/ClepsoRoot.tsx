import {
  Amount,
  Button,
  Card,
  ClepsoRoot,
  Inline,
  List,
  ListRow,
  Mono,
  Pill,
  RowSep,
  Stack,
  Text,
} from '@lawfirm/ui-web';

export const Light = () => (
  <div style={{ maxWidth: 390 }}>
    <ClepsoRoot theme="light" style={{ padding: 16, borderRadius: 12 }}>
      <Stack>
        <Text variant="title-2">Estate of Harold Bennett</Text>
        <Text variant="label" tone="muted">
          Margaret Bennett <RowSep /> Probate <RowSep /> <Mono>2026-0187</Mono>
        </Text>
        <Card
          title="Unbilled time"
          subtitle="14.8h since Aug 14"
          headerAction={
            <Pill tone="warning" dot>
              Filing in 4d
            </Pill>
          }
        >
          <Amount cents={482500} size="lg" />
        </Card>
        <Button variant="primary">Log time</Button>
      </Stack>
    </ClepsoRoot>
  </div>
);

export const Dark = () => (
  <div style={{ maxWidth: 390 }}>
    <ClepsoRoot theme="dark" style={{ padding: 16, borderRadius: 12 }}>
      <Stack>
        <Text variant="label" tone="muted">
          Courthouse mode
        </Text>
        <Card
          title="Trust balance"
          subtitle={
            <>
              IOLTA <Mono>····4821</Mono>
            </>
          }
          headerAction={
            <Pill tone="success" dot>
              Reconciled
            </Pill>
          }
        >
          <Amount cents={1824000} size="lg" />
        </Card>
        <Button variant="primary">Record deposit</Button>
      </Stack>
    </ClepsoRoot>
  </div>
);

export const WebDensity = () => (
  <ClepsoRoot density="web" style={{ padding: 16, borderRadius: 12 }}>
    <Stack>
      <Inline>
        <Button variant="primary" icon="plus">
          New matter
        </Button>
        <Button variant="secondary">Export</Button>
        <Text variant="body-sm" tone="muted">
          36px controls · 52px rows · 14px body
        </Text>
      </Inline>
      <List>
        <ListRow
          title="Alvarez v. Meridian Logistics"
          subtitle={
            <>
              Sofia Alvarez <RowSep /> Personal injury <RowSep /> <Mono>2026-0142</Mono>
            </>
          }
          pill={<Pill tone="accent">Discovery</Pill>}
          meta="Cutoff Oct 24"
          chevron
          pressable
        />
        <ListRow
          title="Kessler Holdings — Series B"
          subtitle={
            <>
              Corporate <RowSep /> Flat fee <RowSep /> <Mono>2026-0201</Mono>
            </>
          }
          pill={<Pill tone="info">Sent</Pill>}
          meta="$25,000.00 due Oct 9"
          chevron
          pressable
        />
      </List>
    </Stack>
  </ClepsoRoot>
);
