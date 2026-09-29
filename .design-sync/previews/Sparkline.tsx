import { Card, Pill, Sparkline, Spread, Text } from '@lawfirm/ui-web';

export const Collected = () => (
  <div style={{ maxWidth: 358 }}>
    <Sparkline title="Collected · last 6 months" points={[42, 48, 45, 58, 61, 72]} />
  </div>
);

export const DaysToPay = () => (
  <div style={{ maxWidth: 358 }}>
    <Sparkline title="Days to pay · last 8 invoices" points={[46, 41, 38, 39, 31, 27, 24, 19]} />
  </div>
);

export const InKpiCard = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      title="Collected · 30d"
      headerAction={
        <Pill tone="success" icon="arrow-up-right">
          18%
        </Pill>
      }
    >
      <Text variant="amount-lg" as="div">
        $12,450.00
      </Text>
      <Sparkline points={[8200, 9100, 8600, 10400, 11200, 12450]} style={{ marginTop: 8 }} />
      <Spread style={{ marginTop: 6 }}>
        <Text variant="caption" tone="muted">
          Apr
        </Text>
        <Text variant="caption" tone="muted">
          Sep
        </Text>
      </Spread>
    </Card>
  </div>
);
