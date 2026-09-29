---
category: Inputs
---

Text input, 48px on mobile and 40 on web, with icon, prefix, suffix, search and amount modes.

`search` renders the tonal borderless search field. `amount` right-aligns tabular digits; pair with `prefix="$"`. `focused` paints the focus ring for static mockups.

```tsx
<Input search icon="search" placeholder="Search matters, contacts, invoices" />
<Field label="Hourly rate"><Input amount prefix="$" suffix="/ hr" value="325.00" /></Field>
```
