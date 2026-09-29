# List rows
The workhorse of the product: a 60px row with an optional leading element, a two-line body, and a trailing value/status column.

**Variants by content.** Matter (title, client · practice · mono number, deadline pill + unbilled), task (round check, due date red when overdue), time entry (h:mm + date block, narrative, code, amount + billable pill), invoice (client, mono number · matter, amount + status), contact (avatar, role · phone/email, call action), event (time block, title, location, kind pill).

**Rules.** Rows live inside `cl-list` (surface, hairline, radius 14) or a `--flat` list inside a card. Separators are 1px hairlines inset to the body (`--inset` when a leading avatar exists). Titles truncate to one line; amounts are tabular. Pressable rows show a chevron only when they open a full screen. Swipe actions: Timer (accent) and Done (success) on tasks; Bill and Skip on review items.
