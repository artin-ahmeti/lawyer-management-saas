import { OptionRow, Switch } from '@lawfirm/ui-web';

export const States = () => (
  <div className="cl-inline">
    <Switch checked={false} label="Billable" />
    <Switch checked label="Billable" />
  </div>
);

export const SettingsRows = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow label="Billable" control={<Switch checked />} />
    <div className="cl-divider" />
    <OptionRow
      label="Courthouse mode"
      hint="Silent, dark, quick notes"
      control={<Switch checked={false} />}
    />
    <div className="cl-divider" />
    <OptionRow label="Stay signed in with Face ID" control={<Switch checked />} />
  </div>
);

export const Notifications = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow
      label="Deadline reminders"
      hint="7, 3 and 1 day before a court deadline"
      control={<Switch checked />}
    />
    <div className="cl-divider" />
    <OptionRow label="Missed-call text-back" hint="Replies within 30 seconds" control={<Switch checked />} />
    <div className="cl-divider" />
    <OptionRow
      label="Payment received"
      hint="Push when a client pays an invoice"
      control={<Switch checked={false} />}
    />
  </div>
);
