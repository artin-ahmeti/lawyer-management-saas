---
category: Data display
---

The workhorse row: leading element, two-line body, trailing value/status column.

Content patterns: matter (title, client · practice · `Mono` number, deadline pill + unbilled), task (`lead={<Checkbox />}`, `regular`, red `meta` when overdue), time entry (`lead={<TimeBlock />}`, value + billable pill), invoice (amount + status pill), contact (`lead={<Avatar />}`), event (`TimeBlock` + kind pill). Use `trail` for free-form buttons (Bill / Skip).

```tsx
<ListRow
  title="Estate of Harold Bennett"
  subtitle={
    <>
      Margaret Bennett <RowSep /> Probate <RowSep /> <Mono>2026-0187</Mono>
    </>
  }
  pill={
    <Pill tone="warning" dot>
      Filing · Oct 3
    </Pill>
  }
  meta="$4,825.00 unbilled"
  chevron
  pressable
/>
```
