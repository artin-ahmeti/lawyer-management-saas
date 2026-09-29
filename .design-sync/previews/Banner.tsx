import { Banner, Button, Pill } from '@lawfirm/ui-web';

export const Deadline = () => (
  <div style={{ maxWidth: 358 }}>
    <Banner
      tone="warning"
      icon="alert"
      title="Inventory filing due Fri, Oct 3"
      text="Cal. Prob. Code §8800 · 4 days · chained from letters issued Jun 3"
      actions={
        <>
          <Button variant="primary" size="sm">
            Add to calendar
          </Button>
          <Button variant="ghost" size="sm">
            Mark filed
          </Button>
        </>
      }
    />
  </div>
);

export const TrustAnomaly = () => (
  <div style={{ maxWidth: 358 }}>
    <Banner
      tone="danger"
      icon="lock"
      title="Trust balance below client ledger"
      text="IOLTA ····4821 shows $18,240.00; ledgers total $18,540.00. Disbursement is blocked until reconciled."
      actions={
        <Button variant="secondary" size="sm">
          Open reconciliation
        </Button>
      }
    />
  </div>
);

export const AiDisclosure = () => (
  <div style={{ maxWidth: 358 }}>
    <Banner
      tone="outline"
      icon="pen"
      title="AI drafted this narrative"
      text="Reviewed by you before it is billed. Nothing from this matter is used to train models."
      dismissible
    />
  </div>
);

export const MissedCall = () => (
  <div style={{ maxWidth: 358 }}>
    <Banner
      tone="accent"
      icon="phone"
      title="Missed call · (628) 555-0147 · 2 min ago"
      text="Text-back sent: “Thanks for calling Tran & Okafor. How can we help?” No reply yet."
      actions={
        <>
          <Button variant="primary" size="sm">
            Call back
          </Button>
          <Button variant="ghost" size="sm">
            Open lead
          </Button>
        </>
      }
    />
  </div>
);

export const Compact = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack cl-stack--sm">
    <Banner tone="info" icon="calendar" compact title="Google Calendar synced 2 min ago" />
    <Banner tone="success" icon="check" compact title="Invoice sent · pay link texted to Margaret" />
    <Banner icon="wifi-off" compact tone="outline" title="Offline · changes will sync" trailing={<Pill>3 queued</Pill>} />
  </div>
);
