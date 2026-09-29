---
category: Data display
---

Grouped list container: surface, hairline, 12px radius. Rows go inside; never float rows as cards.

`flat` for a list inside a Card. `footer` for totals or the pay-link state.

```tsx
<List
  footer={
    <>
      <span>Total</span>
      <Amount cents={812500} />
    </>
  }
>
  <ListRow
    title="Draft petition and schedules"
    subtitle="L. Tran · 9.5h × $325.00"
    value="$3,087.50"
    regular
  />
</List>
```
