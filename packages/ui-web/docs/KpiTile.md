---
category: Data display
---

KPI tile: label, tabular value, one delta; at most two per mobile screen, four per web page.

`tint` is reserved for the one number the screen exists to move and may carry `progress`. `deltaTone="up"` is success ink, `down` is danger.

```tsx
<KpiRow>
  <KpiTile tint label="Billed today" value="3.4" unit="of 6h" progress={57} />
  <KpiTile
    label="Outstanding"
    value="$33,125"
    delta="$8,125 overdue"
    deltaTone="down"
    deltaIcon="alert"
  />
</KpiRow>
```
