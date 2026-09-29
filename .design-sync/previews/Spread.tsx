import { Amount, Button, Pill, Spread, Stack, Text } from '@lawfirm/ui-web';

export const LabelValue = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="sm">
      <Spread>
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
      <Spread>
        <Text variant="label" tone="muted">
          Outstanding
        </Text>
        <Amount cents={812500} tone="danger" />
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

export const HeaderRows = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="lg">
      <Spread>
        <Text variant="title-3">Time this week</Text>
        <Button variant="ghost" size="sm">
          See all
        </Button>
      </Spread>
      <Spread>
        <Stack gap="xs">
          <Text variant="body-strong">Estate of Harold Bennett</Text>
          <Text variant="label" tone="muted">
            Margaret Bennett · Probate
          </Text>
        </Stack>
        <Pill tone="warning" dot>
          Filing in 4d
        </Pill>
      </Spread>
      <Spread>
        <Text variant="body">Send pay link by text</Text>
        <Text variant="label" tone="accent">
          Change
        </Text>
      </Spread>
    </Stack>
  </div>
);
