import { ClepsoRoot, Pill, Text } from '@lawfirm/ui-web';

export const Tones = () => (
  <div className="cl-inline">
    <Pill>Draft</Pill>
    <Pill tone="accent">In progress</Pill>
    <Pill tone="success" dot>
      Paid
    </Pill>
    <Pill tone="warning" dot>
      Due in 4d
    </Pill>
    <Pill tone="danger" dot>
      Overdue 46d
    </Pill>
    <Pill tone="info" icon="gavel">
      Court
    </Pill>
    <Pill tone="ink">Mine</Pill>
    <Pill tone="outline">Flat fee</Pill>
    <Pill tone="success" size="lg" dot>
      Reconciled Sep 1
    </Pill>
  </div>
);

export const DomainVocabulary = () => (
  <div className="cl-inline" style={{ gap: 18, alignItems: 'flex-start' }}>
    <div className="cl-stack cl-stack--xs">
      <Text variant="caption" tone="muted">
        Matter
      </Text>
      <div className="cl-inline" style={{ gap: 6 }}>
        <Pill tone="accent">Open</Pill>
        <Pill tone="warning">Pending</Pill>
        <Pill>Closed</Pill>
        <Pill tone="outline">Hourly</Pill>
        <Pill tone="outline">Contingency</Pill>
      </div>
    </div>
    <div className="cl-stack cl-stack--xs">
      <Text variant="caption" tone="muted">
        Invoice
      </Text>
      <div className="cl-inline" style={{ gap: 6 }}>
        <Pill>Draft</Pill>
        <Pill tone="info">Sent</Pill>
        <Pill tone="warning" dot>
          Partial
        </Pill>
        <Pill tone="danger" dot>
          Overdue
        </Pill>
        <Pill tone="success" dot>
          Paid
        </Pill>
      </div>
    </div>
    <div className="cl-stack cl-stack--xs">
      <Text variant="caption" tone="muted">
        Deadline
      </Text>
      <div className="cl-inline" style={{ gap: 6 }}>
        <Pill>In 3 weeks</Pill>
        <Pill tone="warning" dot>
          In 4 days
        </Pill>
        <Pill tone="danger" dot>
          Today
        </Pill>
        <Pill tone="danger" dot>
          Missed
        </Pill>
      </div>
    </div>
    <div className="cl-stack cl-stack--xs">
      <Text variant="caption" tone="muted">
        Time
      </Text>
      <div className="cl-inline" style={{ gap: 6 }}>
        <Pill tone="success">Billable</Pill>
        <Pill>No charge</Pill>
        <Pill tone="warning">Written down</Pill>
        <Pill tone="accent">On invoice</Pill>
      </div>
    </div>
  </div>
);

export const Dark = () => (
  <ClepsoRoot theme="dark" style={{ padding: '12px 16px', borderRadius: 12 }}>
    <div className="cl-inline">
      <Pill>Draft</Pill>
      <Pill tone="accent">In progress</Pill>
      <Pill tone="success" dot>
        Paid
      </Pill>
      <Pill tone="warning" dot>
        Due in 4d
      </Pill>
      <Pill tone="danger" dot>
        Overdue 46d
      </Pill>
      <Pill tone="info" icon="gavel">
        Court
      </Pill>
      <Pill tone="ink">Mine</Pill>
      <Pill tone="outline">Flat fee</Pill>
    </div>
  </ClepsoRoot>
);
