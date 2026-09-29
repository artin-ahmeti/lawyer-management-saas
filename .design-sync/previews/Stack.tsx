import { List, ListRow, Mono, Pill, RowSep, SectionHeader, Stack, Text, TimeBlock } from '@lawfirm/ui-web';

const GAPS = [
  ['xs', '4'],
  ['sm', '8'],
  ['md', '12'],
  ['lg', '16'],
  ['xl', '24'],
] as const;

export const Gaps = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      gap: 16,
      alignItems: 'start',
    }}
  >
    {GAPS.map(([gap, px]) => (
      <Stack key={gap} gap="sm">
        <Text variant="caption" tone="muted">
          {gap} · {px}px
        </Text>
        <Stack gap={gap} style={{ alignItems: 'flex-start' }}>
          <Pill tone="accent">Open</Pill>
          <Pill tone="warning" dot>
            Filing in 4d
          </Pill>
          <Pill tone="outline">Hourly · $325.00</Pill>
        </Stack>
      </Stack>
    ))}
  </div>
);

export const Sections = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="xl">
      <Stack gap="sm">
        <SectionHeader title="Needs attention" count={2} />
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
      <Stack gap="sm">
        <SectionHeader title="Today" action="Open calendar" />
        <List>
          <ListRow
            lead={<TimeBlock main="9:30" sub="AM" />}
            title="Pretrial conference"
            subtitle={
              <>
                People v. Webb <RowSep /> Dept. 22
              </>
            }
            pill={
              <Pill tone="info" icon="gavel">
                Court
              </Pill>
            }
          />
          <ListRow
            lead={<TimeBlock main="2:00" sub="PM" />}
            title="Kessler board sync"
            subtitle={
              <>
                Kessler — Series B <RowSep /> Zoom
              </>
            }
            pill={<Pill>Meeting</Pill>}
          />
        </List>
      </Stack>
    </Stack>
  </div>
);
