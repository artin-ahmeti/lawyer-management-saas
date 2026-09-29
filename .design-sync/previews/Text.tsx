import { Amount, Divider, Mono, RowSep, Spread, Stack, Text } from '@lawfirm/ui-web';

const SCALE = [
  ['display', 'Good morning, Dana.', '32/38 · 600', 'default'],
  ['title-1', 'Matters', '28/34 · 600', 'default'],
  ['title-2', 'Estate of Harold Bennett', '22/28 · 600', 'default'],
  ['title-3', 'Review your day', '17/24 · 600', 'default'],
  ['body', 'Draft inventory schedules and file with the probate court before Friday.', '15/22 · 400', 'default'],
  ['body-strong', 'Alvarez v. Meridian Logistics', '15/22 · 600', 'default'],
  ['body-sm', 'Web default in tables, drawers and sidebars.', '14/20 · 400', 'default'],
  ['label', 'Sofia Alvarez · Personal injury · L. Tran', '13/18 · 500', 'muted'],
  ['caption', 'Updated 12 min ago', '12/16 · 500', 'muted'],
  ['overline', 'Needs attention', '11/16 · 600 · caps', 'muted'],
  ['amount-lg', '$8,125.00', '28/34 · 600 · tabular', 'default'],
  ['amount', '1.6h · $520.00', '17/24 · 600 · tabular', 'default'],
  ['mono-id', '2026-0187 · INV-2026-078 · L110', 'Geist Mono 13/18', 'muted'],
  ['mono-timer', '00:42:17', 'Geist Mono 40/44', 'default'],
] as const;

export const Scale = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '170px minmax(0, 1fr)',
      columnGap: 20,
      rowGap: 10,
      alignItems: 'baseline',
    }}
  >
    {SCALE.map(([variant, sample, spec, tone]) => (
      <div key={variant} style={{ display: 'contents' }}>
        <Text variant="caption" tone="muted">
          {variant} · {spec}
        </Text>
        <Text variant={variant} tone={tone}>
          {sample}
        </Text>
      </div>
    ))}
  </div>
);

const TONES = [
  ['default', 'Balance due'],
  ['muted', 'Sent Sep 24'],
  ['faint', 'Draft'],
  ['accent', 'Open matter'],
  ['success', 'Paid Jul 18'],
  ['warning', 'Due in 4 days'],
  ['danger', 'Overdue 46 days'],
] as const;

export const Tones = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
      gap: 12,
    }}
  >
    {TONES.map(([tone, sample]) => (
      <Stack key={tone} gap="xs">
        <Text variant="body-strong" tone={tone}>
          {sample}
        </Text>
        <Text variant="caption" tone="muted">
          {tone}
        </Text>
      </Stack>
    ))}
  </div>
);

export const Hierarchy = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="xs">
      <Text variant="label" tone="muted">
        Monday, September 29
      </Text>
      <Text variant="title-1" balance>
        Good morning, Dana.
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 6 }}>
        3 items to review · 1 hearing at 9:30
      </Text>
      <Divider style={{ margin: '14px 0' }} />
      <Text variant="title-3">Estate of Harold Bennett</Text>
      <Text variant="label" tone="muted">
        Margaret Bennett <RowSep /> Probate <RowSep /> <Mono>2026-0187</Mono>
      </Text>
      <Spread style={{ marginTop: 10 }}>
        <Text variant="label" tone="muted">
          Unbilled
        </Text>
        <Amount cents={482500} />
      </Spread>
      <Spread>
        <Text variant="label" tone="muted">
          Trust balance
        </Text>
        <Amount cents={1824000} />
      </Spread>
    </Stack>
  </div>
);
