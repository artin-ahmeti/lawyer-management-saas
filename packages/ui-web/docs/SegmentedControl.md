---
category: Actions
---

Switches between views of the same object; filters use Chip instead.

`items` are `{ value, label, count? }`. `block` stretches across the screen (Billing: Unbilled · Invoices · Payments · Trust); `scroll` allows overflow (matter detail tabs).

```tsx
<SegmentedControl
  block
  value="invoices"
  onChange={setTab}
  items={[
    { value: 'unbilled', label: 'Unbilled' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'payments', label: 'Payments' },
    { value: 'trust', label: 'Trust' },
  ]}
/>
```
