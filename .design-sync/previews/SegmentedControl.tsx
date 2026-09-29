import { SegmentedControl } from '@lawfirm/ui-web';

export const BillingTabs = () => (
  <div style={{ maxWidth: 358 }}>
    <SegmentedControl
      block
      value="invoices"
      items={[
        { value: 'unbilled', label: 'Unbilled' },
        { value: 'invoices', label: 'Invoices' },
        { value: 'payments', label: 'Payments' },
        { value: 'trust', label: 'Trust' },
      ]}
    />
  </div>
);

export const MatterTabs = () => (
  <div style={{ maxWidth: 358 }}>
    <SegmentedControl
      scroll
      value="overview"
      items={[
        { value: 'overview', label: 'Overview' },
        { value: 'activity', label: 'Activity' },
        { value: 'tasks', label: 'Tasks', count: 4 },
        { value: 'time', label: 'Time' },
        { value: 'documents', label: 'Documents' },
        { value: 'billing', label: 'Billing' },
      ]}
    />
  </div>
);

export const Compact = () => (
  <div className="cl-inline">
    <SegmentedControl
      value="week"
      items={[
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
        { value: 'quarter', label: 'Quarter' },
      ]}
    />
  </div>
);

export const WebDensity = () => (
  <div className="cl-web">
    <div className="cl-inline">
      <SegmentedControl
        value="open"
        items={[
          { value: 'open', label: 'Open', count: 23 },
          { value: 'closed', label: 'Closed', count: 141 },
          { value: 'all', label: 'All' },
        ]}
      />
    </div>
  </div>
);
