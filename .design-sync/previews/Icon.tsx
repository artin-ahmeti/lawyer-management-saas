import { ICON_NAMES, Icon, Inline, Text } from '@lawfirm/ui-web';

export const AllIcons = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: 4,
    }}
  >
    {ICON_NAMES.map((name) => (
      <div
        key={name}
        className="cl-stack cl-stack--xs"
        style={{ alignItems: 'center', padding: '10px 4px' }}
      >
        <Icon name={name} />
        <Text variant="caption" tone="muted">
          {name}
        </Text>
      </div>
    ))}
  </div>
);

const SIZES = [
  ['xs', '14 · dense meta'],
  ['sm', '16 · inline with text'],
  ['md', '20 · buttons, rows'],
  ['lg', '24 · tab bar'],
  ['xl', '28 · empty states'],
] as const;

export const Sizes = () => (
  <Inline style={{ gap: 28, alignItems: 'flex-end' }}>
    {SIZES.map(([size, label]) => (
      <div key={size} className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="briefcase" size={size} />
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </div>
    ))}
  </Inline>
);

export const FilledAndTones = () => (
  <div className="cl-stack cl-stack--lg">
    <Inline style={{ gap: 28 }}>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="home" size="lg" filled className="cl-accent" />
        <Text variant="caption" tone="muted">
          Active tab · filled
        </Text>
      </div>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="briefcase" size="lg" className="cl-muted" />
        <Text variant="caption" tone="muted">
          Inactive tab
        </Text>
      </div>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="alert" className="cl-tone-warning" />
        <Text variant="caption" tone="muted">
          Deadline
        </Text>
      </div>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="lock" className="cl-tone-danger" />
        <Text variant="caption" tone="muted">
          Trust anomaly
        </Text>
      </div>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="check" className="cl-tone-success" />
        <Text variant="caption" tone="muted">
          Paid
        </Text>
      </div>
      <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
        <Icon name="pen" className="cl-muted" />
        <Text variant="caption" tone="muted">
          AI draft
        </Text>
      </div>
    </Inline>
    <Inline style={{ gap: 20 }}>
      <Text variant="body">
        <Icon name="gavel" size="sm" /> Pretrial conference · Dept. 22
      </Text>
      <Text variant="label" tone="muted">
        <Icon name="calendar" size="sm" /> Mon, Sep 29
      </Text>
      <Text variant="label" tone="muted">
        <Icon name="clock" size="sm" /> 1.6h
      </Text>
    </Inline>
  </div>
);
