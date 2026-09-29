# Table (web)
Dense, scannable tables with overline headers, right-aligned tabular numbers and mono identifiers.

Rows are 44px (compact 36). Group rows (`cl-table__group`) carry counts and subtotals; the footer carries totals so no separate tile is needed. Hover tints a row 3%; selection uses `accent-tint`. First column may hold a square check for bulk actions. Wide tables scroll inside `cl-table-wrap`; the sticky header stays. Density is a per-table user preference.
