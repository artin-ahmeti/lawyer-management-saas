import { Amount, Divider, Spread, Stack, Text } from '@lawfirm/ui-web';

export const Totals = () => (
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
      <Divider style={{ margin: '4px 0' }} />
      <Spread>
        <Text variant="body-strong">Balance due</Text>
        <Amount cents={580000} size="lg" />
      </Spread>
    </Stack>
  </div>
);

export const BetweenBlocks = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack>
      <Stack gap="xs">
        <Text variant="title-3">Next event</Text>
        <Text variant="body" tone="muted">
          Inventory filing · Fri, Oct 3 · Cal. Prob. Code §8800
        </Text>
      </Stack>
      <Divider />
      <Stack gap="xs">
        <Text variant="title-3">Client note</Text>
        <Text variant="body" tone="muted">
          Margaret prefers text over email; call after 3 PM.
        </Text>
      </Stack>
      <Divider />
      <Stack gap="xs">
        <Text variant="title-3">Trust</Text>
        <Text variant="body" tone="muted">
          IOLTA ····4821 · $18,240.00 · reconciled Sep 26
        </Text>
      </Stack>
    </Stack>
  </div>
);
