---
category: Data display
---

Label/value pairs in two columns (invoice facts, trust details).

```tsx
<KeyValue
  items={[
    { label: 'Issued', value: 'Jul 15 · net 30' },
    { label: 'Due', value: <Text tone="danger">Aug 14</Text> },
  ]}
/>
```
