---
category: Navigation
---

256px web sidebar: firm switcher, grouped NavItems, pinned footer.

Groups mirror the product: Today and Inbox first, then **Work** (Matters, Contacts, Calendar, Tasks, Documents) and **Money** (Time & expenses, Billing, Trust, Reports).

```tsx
<Sidebar
  firm="Tran & Okafor LLP"
  footer={
    <>
      <NavItem icon="settings" label="Settings" />
      <NavItem lead={<Avatar size="xs" tone="accent" initials="DO" />} label="Dana Okafor" />
    </>
  }
>
  <NavItem icon="home" label="Today" active />
  <NavItem icon="inbox" label="Inbox" count={3} badge />
  <SidebarGroup label="Work" />
  <NavItem icon="briefcase" label="Matters" count={12} />
</Sidebar>
```
