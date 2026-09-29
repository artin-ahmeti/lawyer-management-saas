---
category: Navigation
---

Large-title header for root tabs with an eyebrow and round icon actions.

The Today greeting is the same title-1 ("Good morning, Dana.") with the date as eyebrow.

```tsx
<ScreenHeader
  eyebrow="Monday, September 29"
  title="Good morning, Dana."
  actions={
    <>
      <IconButton icon="inbox" label="Inbox" badge={3} />
      <Avatar tone="accent" initials="DO" />
    </>
  }
/>
```
