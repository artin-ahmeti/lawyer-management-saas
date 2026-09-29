# Spacing & radius
A 4-pt spacing scale, a 20pt mobile gutter, and four radii assigned by role.

**Spacing.** 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Rows pad 12 vertical / 16 horizontal on mobile, 8 / 14 on web. Sections are 24 apart on mobile, 32 on web. Use flex/grid `gap`, not margins on children.

**Radius.** xs 4 (checkbox, progress) · sm 6 (web controls, sidebar items, company avatars) · md 8 (mobile controls, chips) · lg 12 (cards, grouped lists, tiles, timer bar) · xl 16 (sheets, dialogs) · full (pills, person avatars, Capture). Tight radii keep the system crisp; only the device frame is rounder.

**Sizes.** Mobile control 44, input 48, row 60, tab bar 56 + inset. Web control 36, input 40, row 44 (compact 36). Sidebar 256 / 64 collapsed. Content max 1440.
