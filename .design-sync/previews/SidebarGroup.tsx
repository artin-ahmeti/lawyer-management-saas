import { NavItem, SidebarGroup } from '@lawfirm/ui-web';

export const BetweenItems = () => (
  <div className="cl-web" style={{ width: 232, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <NavItem icon="inbox" label="Inbox" count={3} badge />
    <SidebarGroup label="Work" />
    <NavItem icon="briefcase" label="Matters" count={12} active />
    <NavItem icon="users" label="Contacts" />
    <SidebarGroup label="Money" />
    <NavItem icon="clock" label="Time & expenses" />
    <NavItem icon="receipt" label="Billing" />
  </div>
);

export const Labels = () => (
  <div className="cl-web" style={{ width: 232 }}>
    <SidebarGroup label="Work" />
    <SidebarGroup label="Money" />
    <SidebarGroup label="Firm" />
  </div>
);
