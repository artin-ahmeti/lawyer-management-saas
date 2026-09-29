import { BrandMark, Icon, Inline, Text, Wordmark } from '@lawfirm/ui-web';

export const TonesAndSizes = () => (
  <Inline style={{ gap: 28, alignItems: 'flex-end' }}>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <BrandMark />
      <Text variant="caption" tone="muted">
        ink · 32
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <BrandMark tone="accent" />
      <Text variant="caption" tone="muted">
        accent · 32
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <BrandMark size="lg" />
      <Text variant="caption" tone="muted">
        ink · 48
      </Text>
    </div>
    <div className="cl-stack cl-stack--xs" style={{ alignItems: 'center' }}>
      <BrandMark tone="accent" size="lg" />
      <Text variant="caption" tone="muted">
        accent · 48
      </Text>
    </div>
  </Inline>
);

export const Lockups = () => (
  <div className="cl-stack cl-stack--lg">
    <Inline nowrap style={{ gap: 10 }}>
      <BrandMark tone="accent" size="lg" />
      <Wordmark />
    </Inline>
    <Inline nowrap style={{ gap: 10 }}>
      <BrandMark />
      <Text variant="body-strong">Tran &amp; Okafor LLP</Text>
      <Icon name="chevron-down" size="sm" className="cl-muted" />
    </Inline>
  </div>
);
