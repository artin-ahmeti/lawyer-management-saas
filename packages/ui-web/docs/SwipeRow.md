---
category: Data display
---

A row with its swipe actions revealed (static).

```tsx
<SwipeRow
  actions={[
    { label: 'Timer', icon: 'play', tone: 'accent' },
    { label: 'Done', icon: 'check', tone: 'success' },
  ]}
>
  <ListRow lead={<Checkbox checked={false} />} regular title="Prep witness outline" />
</SwipeRow>
```
