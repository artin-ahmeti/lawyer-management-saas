import { Dot, Text } from '@lawfirm/ui-web';

export const Tones = () => (
  <div className="cl-inline" style={{ gap: 14 }}>
    <Dot />
    <Dot tone="accent" />
    <Dot tone="success" />
    <Dot tone="warning" />
    <Dot tone="danger" />
    <Dot tone="info" />
  </div>
);

export const Legend = () => (
  <div className="cl-inline" style={{ gap: 16 }}>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot tone="success" />
      <Text variant="caption" tone="muted">
        Billable
      </Text>
    </span>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot tone="accent" />
      <Text variant="caption" tone="muted">
        On invoice
      </Text>
    </span>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot tone="warning" />
      <Text variant="caption" tone="muted">
        Due in 4 days
      </Text>
    </span>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot tone="danger" />
      <Text variant="caption" tone="muted">
        Overdue 46 days
      </Text>
    </span>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot tone="info" />
      <Text variant="caption" tone="muted">
        Court
      </Text>
    </span>
    <span className="cl-inline" style={{ gap: 6 }}>
      <Dot />
      <Text variant="caption" tone="muted">
        No charge
      </Text>
    </span>
  </div>
);
