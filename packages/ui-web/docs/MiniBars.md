---
category: Charts
---

Single-series bar chart (hours per day vs a goal) with a dashed goal line.

Single series needs no legend; the title names it.

```tsx
<MiniBars
  title="Hours billed · this week"
  total="21.4h"
  goal={6}
  goalLabel="goal 6h"
  max={9}
  bars={[
    { label: 'Mon', value: 7.1 },
    { label: 'Tue', value: 4.7 },
    { label: 'Wed', value: 6.3 },
    { label: 'Today', value: 3.4, today: true },
    { label: 'Fri', value: 0, future: true },
  ]}
/>
```
