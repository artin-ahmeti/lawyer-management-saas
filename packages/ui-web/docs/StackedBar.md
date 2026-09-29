---
category: Charts
---

One-hue stacked bar for magnitude (AR aging) with a legend.

```tsx
<StackedBar
  title="Accounts receivable · aging"
  total="$33,125"
  segments={[
    { label: 'Current', value: 20500, display: '$20,500', step: 2 },
    { label: '1–30', value: 4500, display: '$4,500', step: 3 },
    { label: '31–60', value: 8125, display: '$8,125', step: 5 },
  ]}
/>
```
