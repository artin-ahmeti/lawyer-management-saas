import { BrandMark, Inline, Stack, Text, Wordmark } from '@lawfirm/ui-web';

export const Default = () => (
  <Inline style={{ gap: 32, alignItems: 'baseline' }}>
    <Wordmark />
    <Text variant="caption" tone="muted">
      Geist · 22/28 · 600 · −0.03em
    </Text>
  </Inline>
);

export const SignInLockup = () => (
  <div style={{ maxWidth: 358 }}>
    <Stack gap="sm" style={{ alignItems: 'flex-start' }}>
      <Inline nowrap style={{ gap: 10 }}>
        <BrandMark tone="accent" size="lg" />
        <Wordmark />
      </Inline>
      <Text variant="title-1" style={{ marginTop: 14 }}>
        Welcome back.
      </Text>
      <Text variant="body" tone="muted">
        Tran &amp; Okafor LLP · you were last here yesterday at 6:12 PM.
      </Text>
    </Stack>
  </div>
);
