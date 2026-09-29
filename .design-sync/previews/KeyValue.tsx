import { KeyValue, Mono, Pill, Text } from '@lawfirm/ui-web';

export const InvoiceFacts = () => (
  <div style={{ maxWidth: 358 }}>
    <KeyValue
      items={[
        { label: 'Invoice', value: <Mono ink>INV-2026-078</Mono> },
        { label: 'Issued', value: 'Jul 15 · net 30' },
        {
          label: 'Due',
          value: (
            <Text tone="danger" variant="body-strong">
              Aug 14 · 46 days late
            </Text>
          ),
        },
        { label: 'Pay link', value: 'Texted Sep 12 · opened Sep 13' },
        { label: 'Matter', value: 'Estate of Harold Bennett' },
      ]}
    />
  </div>
);

export const TrustDetails = () => (
  <div style={{ maxWidth: 358 }}>
    <KeyValue
      items={[
        {
          label: 'Account',
          value: (
            <>
              IOLTA <Mono ink>····4821</Mono>
            </>
          ),
        },
        { label: 'Balance', value: '$18,240.00' },
        { label: 'Reconciled', value: 'Sep 1 · next due Oct 1' },
        { label: 'Last deposit', value: '$2,000.00 · Sep 29 · ACH' },
        { label: 'Pending', value: 'Disbursement $1,200.00 · appraiser' },
      ]}
    />
  </div>
);

export const TimeEntry = () => (
  <div style={{ maxWidth: 358 }}>
    <KeyValue
      items={[
        { label: 'Activity', value: 'Draft inventory schedules' },
        { label: 'Duration', value: '1.6h (1:36)' },
        { label: 'Rate', value: '$325.00 / h' },
        { label: 'Amount', value: '$520.00' },
        { label: 'UTBMS', value: <Mono ink>L110</Mono> },
        { label: 'Status', value: <Pill tone="success">Billable</Pill> },
      ]}
    />
  </div>
);
