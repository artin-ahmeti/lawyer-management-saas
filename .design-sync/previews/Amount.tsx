import { Amount, Divider, Inline, Spread, Stack, Text } from '@lawfirm/ui-web';

export const CentsAndValue = () => (
  <Inline style={{ gap: 32, alignItems: 'flex-end' }}>
    <Stack gap="xs">
      <Amount cents={812500} />
      <Text variant="caption" tone="muted">
        cents · 812500
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount cents={2500000} />
      <Text variant="caption" tone="muted">
        cents · 2500000
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount cents={32500} dimCents={false} />
      <Text variant="caption" tone="muted">
        cents · dimCents off
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount value="1.6h" />
      <Text variant="caption" tone="muted">
        value · hours
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount value="1:36" />
      <Text variant="caption" tone="muted">
        value · h:mm
      </Text>
    </Stack>
  </Inline>
);

export const Sizes = () => (
  <Inline style={{ gap: 40, alignItems: 'baseline' }}>
    <Stack gap="xs">
      <Amount cents={812500} />
      <Text variant="caption" tone="muted">
        md · 17/24 · rows
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount cents={812500} size="lg" />
      <Text variant="caption" tone="muted">
        lg · 28/34 · totals
      </Text>
    </Stack>
    <Stack gap="xs">
      <Amount cents={812500} size="display" />
      <Text variant="caption" tone="muted">
        display · 32/38 · invoice total
      </Text>
    </Stack>
  </Inline>
);

export const Tones = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="sm">
      <Spread>
        <Text variant="label" tone="muted">
          Fees · 24.0h
        </Text>
        <Amount cents={780000} />
      </Spread>
      <Spread>
        <Text variant="label" tone="muted">
          Trust applied
        </Text>
        <Amount value="−$2,000.00" tone="success" />
      </Spread>
      <Spread>
        <Text variant="label" tone="muted">
          Late fee
        </Text>
        <Amount value="+$81.25" tone="danger" />
      </Spread>
      <Divider style={{ margin: '4px 0' }} />
      <Spread>
        <Text variant="body-strong">Balance due</Text>
        <Amount cents={588125} size="lg" />
      </Spread>
      <Spread>
        <Text variant="label" tone="muted">
          Last payment · Jul 18
        </Text>
        <Amount cents={445000} tone="muted" />
      </Spread>
    </Stack>
  </div>
);
