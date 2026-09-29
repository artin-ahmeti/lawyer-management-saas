---
category: Foundations
---

Typography primitive: one of 14 type styles plus a tone.

Variants: `display` 32/38 · `title-1` 28/34 · `title-2` 22/28 · `title-3` 17/24 · `body` 15/22 · `body-strong` · `body-sm` 14/20 · `label` 13/18 · `caption` 12/16 · `overline` 11 caps · `amount-lg` · `amount` · `mono-id` · `mono-timer`. Tones: `muted` (ink-secondary), `faint`, `accent`, `success`, `warning`, `danger`. Hierarchy comes from size and weight; colour only from tone.

```tsx
<Text variant="title-1">Matters</Text>
<Text variant="label" tone="muted">Margaret Bennett · Probate</Text>
```
