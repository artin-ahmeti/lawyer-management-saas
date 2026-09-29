---
category: Foundations
---

Money and hours as first-class type: tabular, 600 weight, dimmed cents.

Pass integer `cents` (the app's money convention) or a preformatted `value` such as "1.6h". Sizes `md` 17 · `lg` 28 · `display` 32. `tone="success"` for adjustments that favour the client, `danger` for fees.

```tsx
<Amount cents={812500} size="lg" />   // $8,125.00
<Amount value="1.6h" />
```
