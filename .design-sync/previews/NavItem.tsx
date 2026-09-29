import { Avatar, NavItem } from '@lawfirm/ui-web';

export const Active = () => (
  <div className="cl-web" style={{ width: 232 }}>
    <NavItem icon="receipt" label="Billing" active />
  </div>
);

export const States = () => (
  <div className="cl-web" style={{ width: 232, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <NavItem icon="home" label="Today" />
    <NavItem icon="inbox" label="Inbox" count={3} badge />
    <NavItem icon="briefcase" label="Matters" count={12} active />
    <NavItem icon="check" label="Tasks" count={7} />
    <NavItem icon="lock" label="Trust" />
  </div>
);

export const WithAvatar = () => (
  <div className="cl-web" style={{ width: 232, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <NavItem icon="settings" label="Settings" />
    <NavItem lead={<Avatar size="xs" tone="accent" initials="DO" />} label="Dana Okafor" />
  </div>
);
