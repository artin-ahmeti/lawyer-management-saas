---
category: Domain
---

The 3×2 Capture grid: Start timer, Voice memo, Log time, Expense, Task, Note.

Renders the default six actions; pass `items` to change them.

```tsx
<Sheet
  title="Capture"
  headerRight={
    <Text variant="label" tone="muted">
      to <b>Estate of Bennett</b>
    </Text>
  }
>
  <CaptureGrid />
</Sheet>
```
