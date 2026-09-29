import { Inline, List, ListRow, Mono, Pill, RowSep, Stack, Text } from '@lawfirm/ui-web';

export const Identifiers = () => (
  <Inline style={{ gap: 24 }}>
    <Stack gap="xs">
      <Mono>2026-0187</Mono>
      <Text variant="caption" tone="muted">
        Matter
      </Text>
    </Stack>
    <Stack gap="xs">
      <Mono>INV-2026-078</Mono>
      <Text variant="caption" tone="muted">
        Invoice
      </Text>
    </Stack>
    <Stack gap="xs">
      <Mono>L110</Mono>
      <Text variant="caption" tone="muted">
        UTBMS task
      </Text>
    </Stack>
    <Stack gap="xs">
      <Mono>A104</Mono>
      <Text variant="caption" tone="muted">
        UTBMS activity
      </Text>
    </Stack>
    <Stack gap="xs">
      <Mono>····4821</Mono>
      <Text variant="caption" tone="muted">
        IOLTA suffix
      </Text>
    </Stack>
    <Stack gap="xs">
      <Mono ink>INV-2026-078</Mono>
      <Text variant="caption" tone="muted">
        ink · in titles
      </Text>
    </Stack>
  </Inline>
);

export const InRows = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        title="Estate of Harold Bennett"
        subtitle={
          <>
            Margaret Bennett <RowSep /> <Mono>2026-0187</Mono>
          </>
        }
        pill={<Pill tone="accent">Open</Pill>}
        chevron
        pressable
      />
      <ListRow
        title={<Mono ink>INV-2026-078</Mono>}
        subtitle={
          <>
            Margaret Bennett <RowSep /> Sent Aug 14
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
        regular
        title="Draft inventory schedules"
        subtitle={
          <>
            Estate of Bennett <RowSep /> <Mono>L110</Mono> <RowSep /> <Mono>A104</Mono>
          </>
        }
        value="1.6h"
        meta="$520.00"
      />
    </List>
  </div>
);
