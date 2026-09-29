---
category: Actions
---

Filter chip; the selected chip is an ink fill and counts are tabular.

Keep the first chip "All" with the total. `trailing="chevron"` for dropdown chips, `trailing="close"` for applied filters.

```tsx
<ChipGroup>
  <Chip active count={12}>
    All
  </Chip>
  <Chip count={5}>Mine</Chip>
  <Chip trailing="chevron">Practice area</Chip>
</ChipGroup>
```
