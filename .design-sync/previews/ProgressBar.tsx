import { ProgressBar, Text } from '@lawfirm/ui-web';

export const Basic = () => (
  <div style={{ maxWidth: 358 }}>
    <ProgressBar value={57} />
  </div>
);

export const Labeled = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack cl-stack--lg">
    <div>
      <div className="cl-spread">
        <Text variant="label">Dana Okafor</Text>
        <Text variant="label" tone="muted">
          3.4 of 6h
        </Text>
      </div>
      <ProgressBar value={57} />
    </div>
    <div>
      <div className="cl-spread">
        <Text variant="label">Lisa Tran</Text>
        <Text variant="label" tone="muted">
          5.1 of 6h
        </Text>
      </div>
      <ProgressBar value={85} />
    </div>
    <div>
      <div className="cl-spread">
        <Text variant="label">J. Whitfield</Text>
        <Text variant="label" tone="muted">
          6.0 of 6h
        </Text>
      </div>
      <ProgressBar value={100} />
    </div>
    <div>
      <div className="cl-spread">
        <Text variant="label">Payment plan · INV-2026-078</Text>
        <Text variant="label" tone="muted">
          $2,031.25 of $8,125.00
        </Text>
      </div>
      <ProgressBar value={25} />
    </div>
  </div>
);
