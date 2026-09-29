# Audit — current design system (September 29, 2026)

Scope: `packages/ui` (tokens + Tailwind preset), `apps/mobile/src/components/ui` (nine primitives), and every screen under `apps/mobile/app`. Ordered by how much each finding hurts. The replacement is the Clepso system in `design/system`.

## Findings

### 1. No typographic system (high)

- `packages/ui/tailwind-preset.cjs` defines four sizes (display 28, title 20, body 15, caption 12) on the platform font. No label, overline, amount or identifier styles; no letter-spacing; no tabular figures.
- The timer in `apps/mobile/app/(app)/(tabs)/time.tsx` uses a generic `font-mono` with `tracking-widest`; amounts in lists are proportional and wobble.
- Hierarchy comes from size alone, so screens read flat. Section headers (`SectionHeader.tsx`) reuse the 20px title size.

### 2. Card soup instead of lists (high)

- `Card.tsx` is the only container (`rounded-lg bg-surface p-4`, 18px radius). Matters (`matters.tsx`), invoices (`billing.tsx`), contacts (`contacts.tsx`) and home sections are stacks of floating cards with 12px gaps; a matter row costs about 90px.
- Row separators use `border-line-faint` but are not inset; there is no list container, no row anatomy, no trailing value column.

### 3. Dark-only, with hard-coded colours (high)

- `packages/ui/src/tokens.ts`: “Dark-first: these ARE the dark theme values.” There is no light theme. `app/_layout.tsx` pins `StatusBar style="light"` and `contentStyle` to `#1B2632`.
- Hex literals bypass tokens in `Button.tsx` (`#1B2632`, `#FFB162`), `Input.tsx` (`#8B94A3`), `EmptyState.tsx` (`#C9C1B1`), `(tabs)/_layout.tsx` (five values), `home.tsx`, `time.tsx`, `billing.tsx`, `matters/[id].tsx`, `contacts.tsx`, `index.tsx`.
- Dense billing data read in daylight needs a light theme; dark is the courthouse case.

### 4. The accent means everything (medium)

- `#FFB162` is `primary`, `warning`, event icons, badges, unbilled amounts, filter chips, the active tab and the emphasis tile. `rust`/`danger` cover both priority and overdue. `success` (`#9CB380`) is a low-chroma olive.
- `ink-faint` (`#8B94A3`) on canvas is about 3.6:1, below the 4.5:1 text minimum; `text-primary-fg/70` on the accent tile also fails.

### 5. Two sources of truth, both incomplete (medium)

- `tokens.ts` and `tailwind-preset.cjs` duplicate values with a “keep in sync” comment. Neither holds spacing (beyond five steps), type, motion, elevation or sizes; neither has a light/dark structure; the future web app would have to redeclare everything.

### 6. Navigation doesn't match the strategy (medium)

- `(tabs)/_layout.tsx`: five equal tabs (Home, Matters, Tasks, Time, Billing). Capture is a whole tab; contacts are behind the avatar; no calendar, inbox or lead surface. The strategy's first feature (“capture, don't enter”) needs capture reachable from every screen and a timer visible everywhere.

### 7. Nine primitives, no product components (medium)

- Avatar, Badge, Button, Card, EmptyState, Input, Screen, SectionHeader, StatCard. Missing: list row, segmented control, sheet, banner, toast, stage tracker, table, timer bar, chip, switch, dialog, form group.
- `Badge.tsx` is uppercase with `tracking-wide` at 12px; `Button.tsx` has no icon slot, no web sizes, no focus state; `Input.tsx` has no affixes or focus/disabled states.

### 8. Details (low)

- `StatCard` “emphasis” is a full accent fill that competes with the primary button.
- Tab bar height is fixed at 84 with no safe-area logic; `Screen.tsx` hard-codes `paddingBottom: 112`.
- No reduced-motion handling; no focus rings.
- `sign-in.tsx` prints demo credentials on the screen.

## Keep

- The 20pt gutter (`px-5`), integer minutes and integer cents from `@lawfirm/core`, FlashList, the bottom-sheet dependency, the feature-slice structure, the mock hooks (the redesign is presentation-only), and dark mode as a real requirement (it becomes the second theme).

## What replaces it

See `design/system/README.md` (brand book) and `design/system/preview.html` (the proposal with live components and 12 screens). Implementation order is in section 08 of the proposal.
