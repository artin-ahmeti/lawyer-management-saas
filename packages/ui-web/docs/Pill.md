---
category: Data display
---

24px status pill in eight tones; describes state, never acts.

Tones: `neutral` (draft, closed, no charge) · `accent` (open, in progress, on invoice) · `success` (paid, reconciled, done, billable) · `warning` (due ≤7 days, partial, written down) · `danger` (overdue, missed, trust anomaly) · `info` (court, sync) · `ink` (the current user's filter) · `outline` (attributes: Hourly, Flat fee). Add `dot` when the pill is the only status marker in a row.

```tsx
<Pill tone="danger" dot>Overdue 46d</Pill> <Pill tone="info" icon="gavel">Court</Pill>
```
