---
category: Navigation
---

Mobile tab bar: Today · Matters · Capture · Calendar · Billing.

Pass four items; the Capture button renders in the middle unless `capture={false}` (client app). The `TimerBar` docks above it in `PhoneFrame bottom`.

```tsx
<TabBar
  activeKey="today"
  items={[
    { key: 'today', label: 'Today', icon: 'home' },
    { key: 'matters', label: 'Matters', icon: 'briefcase' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar' },
    { key: 'billing', label: 'Billing', icon: 'receipt' },
  ]}
/>
```
