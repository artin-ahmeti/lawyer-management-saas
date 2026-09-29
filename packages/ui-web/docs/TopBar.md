---
category: Navigation
---

56px web top bar: sidebar toggle, ⌘K search, running timer, right cluster.

```tsx
<TopBar
  timer={{ title: 'Estate of Bennett', time: '00:42:17' }}
  right={
    <>
      <Button variant="primary" icon="plus">
        Capture
      </Button>
      <IconButton icon="bell" label="Alerts" badge={2} />
      <Avatar size="sm" tone="accent" initials="DO" />
    </>
  }
/>
```
