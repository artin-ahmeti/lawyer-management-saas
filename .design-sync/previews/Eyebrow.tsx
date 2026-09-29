import { Eyebrow, Inline, List, ListRow, Mono, Pill, RowSep, Stack } from '@lawfirm/ui-web';

export const Default = () => (
  <Inline style={{ gap: 28 }}>
    <Eyebrow>Needs attention</Eyebrow>
    <Eyebrow>Today</Eyebrow>
    <Eyebrow>Unbilled time</Eyebrow>
    <Eyebrow>Trust · IOLTA ····4821</Eyebrow>
  </Inline>
);

export const AboveList = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="sm">
      <Eyebrow>Needs attention</Eyebrow>
      <List>
        <ListRow
          title="Inventory filing due Fri, Oct 3"
          subtitle={
            <>
              Estate of Bennett <RowSep /> Cal. Prob. Code §8800
            </>
          }
          pill={
            <Pill tone="warning" dot>
              4 days
            </Pill>
          }
          chevron
          pressable
        />
        <ListRow
          title="Margaret Bennett"
          subtitle={
            <>
              <Mono>INV-2026-078</Mono> <RowSep /> Sent Aug 14
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
      </List>
    </Stack>
  </div>
);
