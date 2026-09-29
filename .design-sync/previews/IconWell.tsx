import { IconWell, Inline, List, ListRow, Mono, Pill, RowSep, Text } from '@lawfirm/ui-web';

const TONES = [
  ['neutral', 'phone', 'Call'],
  ['accent', 'play', 'Start timer'],
  ['success', 'dollar', 'Payment'],
  ['warning', 'alert', 'Deadline'],
  ['danger', 'lock', 'Trust'],
  ['info', 'gavel', 'Court'],
] as const;

export const Tones = () => (
  <Inline style={{ gap: 24 }}>
    {TONES.map(([tone, name, label]) => (
      <div key={tone} className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <IconWell name={name} tone={tone} />
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </div>
    ))}
  </Inline>
);

export const SizesAndRound = () => (
  <Inline style={{ gap: 24, alignItems: 'flex-end' }}>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <IconWell name="clock" />
      <Text variant="caption" tone="muted">
        md · 36
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <IconWell name="clock" tone="accent" size="lg" />
      <Text variant="caption" tone="muted">
        lg · 44 · Capture
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <IconWell name="mic" tone="accent" size="lg" />
      <Text variant="caption" tone="muted">
        Voice note
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <IconWell name="user" round />
      <Text variant="caption" tone="muted">
        round
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <IconWell name="check" tone="success" size="lg" round />
      <Text variant="caption" tone="muted">
        lg round
      </Text>
    </div>
  </Inline>
);

export const LeadingRows = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<IconWell name="phone" />}
        regular
        title="Call · Sofia Alvarez · 12 min"
        subtitle="Alvarez v. Meridian · 10:12 AM"
        pill={<Pill tone="success">Billable</Pill>}
      />
      <ListRow
        lead={<IconWell name="alert" tone="warning" />}
        regular
        title="Inventory filing due"
        subtitle={
          <>
            Estate of Bennett <RowSep /> Fri, Oct 3
          </>
        }
        pill={
          <Pill tone="warning" dot>
            4 days
          </Pill>
        }
      />
      <ListRow
        lead={<IconWell name="dollar" tone="success" />}
        regular
        title="Payment received"
        subtitle={
          <>
            <Mono>INV-2026-061</Mono> <RowSep /> Nguyen
          </>
        }
        value="$4,450.00"
        meta="Jul 18"
      />
      <ListRow
        lead={<IconWell name="gavel" tone="info" />}
        regular
        title="Pretrial conference"
        subtitle={
          <>
            People v. Webb <RowSep /> Dept. 22
          </>
        }
        meta="9:30 AM"
        chevron
        pressable
      />
    </List>
  </div>
);
