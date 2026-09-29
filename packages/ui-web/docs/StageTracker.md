---
category: Data display
---

Where a matter is in its playbook: horizontal for staff, vertical plain language for clients.

Stages come from the practice playbook. `variant="client"` rewrites each stage in plain language and states the next dated event via `next`.

```tsx
<StageTracker stages={[{ label: 'Intake', state: 'done' }, { label: 'Petition', state: 'done' }, { label: 'Inventory', state: 'current' }, { label: 'Creditors' }, { label: 'Close' }]} />
<StageTracker variant="client" stages={[{ label: 'We opened your case and filed the petition', state: 'done' }, { label: 'Inventory', state: 'current', next: <>Next: we file the estate inventory by <b>Oct 3</b>.</> }, { label: 'Creditor notice period (about 4 months)' }]} />
```
