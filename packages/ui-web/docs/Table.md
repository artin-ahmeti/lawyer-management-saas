---
category: Data display
---

Dense web table: overline headers, right-aligned tabular numbers, group and footer rows.

Rows are `{ id, cells, selected?, kind?: 'group' | 'foot', strong? }`. Group rows carry counts and subtotals; the footer carries totals. `compact` switches to 36px rows. Use `CellTitle` for two-line cells and `Mono` for identifiers.

```tsx
<Table
  columns={[
    { key: 'm', header: 'Matter' },
    { key: 'c', header: 'Client' },
    { key: 'u', header: 'Unbilled', align: 'right' },
  ]}
  rows={[
    { id: 'g1', kind: 'group', cells: ['Needs attention · 2'] },
    {
      id: 'r1',
      selected: true,
      strong: [2],
      cells: [
        <CellTitle
          title="Estate of Harold Bennett"
          sub={
            <>
              <Mono>2026-0187</Mono> · Probate
            </>
          }
        />,
        'Margaret Bennett',
        '$4,825.00',
      ],
    },
    { id: 'f', kind: 'foot', cells: ['9 matters', '', '$20,325.00'] },
  ]}
/>
```
