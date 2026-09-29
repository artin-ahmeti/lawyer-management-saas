import { Avatar, ClepsoRoot, NavItem, Sidebar, SidebarGroup } from '@lawfirm/ui-web';

const Footer = () => (
  <>
    <NavItem icon="settings" label="Settings" />
    <NavItem lead={<Avatar size="xs" tone="accent" initials="DO" />} label="Dana Okafor" />
  </>
);

export const Full = () => (
  <div className="cl-web">
    <Sidebar
      firm="Tran & Okafor LLP"
      footer={<Footer />}
      style={{ width: 256, height: 520, border: '1px solid var(--hairline)', borderRadius: 14 }}
    >
      <NavItem icon="home" label="Today" active />
      <NavItem icon="inbox" label="Inbox" count={3} badge />
      <SidebarGroup label="Work" />
      <NavItem icon="briefcase" label="Matters" count={12} />
      <NavItem icon="users" label="Contacts" />
      <NavItem icon="calendar" label="Calendar" />
      <NavItem icon="check" label="Tasks" count={7} />
      <NavItem icon="folder" label="Documents" />
      <SidebarGroup label="Money" />
      <NavItem icon="clock" label="Time & expenses" />
      <NavItem icon="receipt" label="Billing" />
      <NavItem icon="lock" label="Trust" />
      <NavItem icon="chart" label="Reports" />
    </Sidebar>
  </div>
);

export const Courthouse = () => (
  <ClepsoRoot theme="dark" density="web" style={{ display: 'inline-block', borderRadius: 14 }}>
    <Sidebar
      firm="Tran & Okafor LLP"
      footer={<Footer />}
      style={{ width: 256, height: 520, border: '1px solid var(--hairline)', borderRadius: 14 }}
    >
      <NavItem icon="home" label="Today" />
      <NavItem icon="inbox" label="Inbox" count={3} badge />
      <SidebarGroup label="Work" />
      <NavItem icon="briefcase" label="Matters" count={12} active />
      <NavItem icon="users" label="Contacts" />
      <NavItem icon="calendar" label="Calendar" />
      <NavItem icon="check" label="Tasks" count={7} />
      <NavItem icon="folder" label="Documents" />
      <SidebarGroup label="Money" />
      <NavItem icon="clock" label="Time & expenses" />
      <NavItem icon="receipt" label="Billing" />
      <NavItem icon="lock" label="Trust" />
      <NavItem icon="chart" label="Reports" />
    </Sidebar>
  </ClepsoRoot>
);
