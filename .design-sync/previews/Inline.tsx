import { Amount, Avatar, Inline, Pill, Stack, Text } from '@lawfirm/ui-web';

export const Pills = () => (
  <div style={{ maxWidth: 358 }}>
    <Inline>
      <Pill tone="accent">Open</Pill>
      <Pill tone="outline">Probate</Pill>
      <Pill tone="outline">Hourly · $325.00</Pill>
      <Pill tone="warning" dot>
        Filing in 4d
      </Pill>
      <Pill tone="ink">L. Tran</Pill>
      <Pill tone="info" icon="gavel">
        Court
      </Pill>
      <Pill>Draft</Pill>
    </Inline>
  </div>
);

export const Nowrap = () => (
  <div style={{ maxWidth: 358 }}>
    <Inline nowrap>
      <Avatar name="Margaret Bennett" />
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant="body-strong"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          Margaret Bennett
        </Text>
        <Text
          variant="label"
          tone="muted"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          Client · Estate of Harold Bennett · Probate
        </Text>
      </Stack>
      <Amount cents={812500} />
    </Inline>
  </div>
);
