import { Timeline } from '@lawfirm/ui-web';

export const MatterActivity = () => (
  <div style={{ maxWidth: 358 }}>
    <Timeline
      events={[
        {
          icon: 'dollar',
          tone: 'accent',
          title: (
            <>
              <b>Payment received</b> · $2,000.00 by ACH from Margaret Bennett
            </>
          ),
          meta: 'Today 8:12 AM · applied to INV-2026-078',
        },
        {
          icon: 'message',
          title: (
            <>
              <b>L. Tran</b> sent a client update
            </>
          ),
          meta: 'Yesterday 4:40 PM · visible to client',
          quote: 'We filed the inventory with the court today. Nothing is needed from you this week.',
        },
        {
          icon: 'file',
          title: (
            <>
              <b>Inventory and Appraisal</b> filed · DE-160.pdf
            </>
          ),
          meta: 'Yesterday 3:05 PM · L. Tran',
        },
        {
          icon: 'clock',
          title: (
            <>
              <b>1.6h</b> · Draft inventory schedules
            </>
          ),
          meta: 'Yesterday · L110 · billable',
        },
        {
          icon: 'check',
          title: (
            <>
              Stage moved to <b>Inventory</b>
            </>
          ),
          meta: 'Sep 22 · D. Okafor',
        },
      ]}
    />
  </div>
);

export const InvoiceHistory = () => (
  <div style={{ maxWidth: 358 }}>
    <Timeline
      events={[
        {
          icon: 'dollar',
          tone: 'accent',
          title: (
            <>
              <b>Partial payment</b> · $2,000.00 by ACH
            </>
          ),
          meta: 'Today 8:12 AM · $6,125.00 remaining',
        },
        {
          icon: 'link',
          title: (
            <>
              <b>Margaret Bennett</b> opened the pay link
            </>
          ),
          meta: 'Sep 13 9:41 PM · not paid',
        },
        {
          icon: 'send',
          title: (
            <>
              <b>Pay link texted</b> to (415) 555-0186
            </>
          ),
          meta: 'Sep 12 · D. Okafor',
        },
        {
          icon: 'receipt',
          title: (
            <>
              <b>INV-2026-078</b> sent · $8,125.00 · net 30
            </>
          ),
          meta: 'Jul 15 · due Aug 14',
        },
      ]}
    />
  </div>
);
