---
category: Feedback
---

Inline, contextual message at the top of the content it concerns.

Tones: `warning` (deadline within 7 days), `danger` (trust anomaly, missed deadline), `success`, `info` (sync), `accent` (an opportunity: missed-call text-back), `outline` (must be present but not alarming: AI disclosure, ethical walls). `compact` is one line with no actions. Never a global strip; never more than two stacked.

```tsx
<Banner
  tone="warning"
  icon="alert"
  title="Inventory filing due Fri, Oct 3"
  text="Prob. Code §8800 · 4 days"
  actions={
    <>
      <Button variant="primary" size="sm">
        Add to calendar
      </Button>
      <Button variant="ghost" size="sm">
        Mark filed
      </Button>
    </>
  }
/>
```
