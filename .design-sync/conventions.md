# Building with Clepso — read this first

Clepso is a light-first, cobalt-on-graphite design system for a law-firm practice platform (time capture, billing, matters, trust accounting). Every component renders from `window.Clepso.*`; every style comes from the bound `styles.css`, which imports `_ds_bundle.css` (tokens + all `cl-*` classes).

## 1. Wrap every screen in `ClepsoRoot`

- Web page: `<ClepsoRoot density="web">…</ClepsoRoot>` — 36px controls, 44px table rows, 14px body.
- Phone screen: `<ClepsoRoot>` (mobile density, the default), usually inside `<PhoneFrame bottom={<><TimerBar …/><TabBar …/></>}>`.
- Courthouse mode: `theme="dark"`. Both themes are designed; never invert colours by hand.
- Without `ClepsoRoot` text falls back to the host font and the canvas background is missing.
- Web pages live in `<AppShell sidebar={<Sidebar …/>} topbar={<TopBar …/>} drawer={…}>`; wrap in `<BrowserFrame>` only when presenting a mockup.

## 2. The styling idiom: components first, then `cl-*` classes, then tokens

Use a library component for every control, row, pill, tile, banner and frame. For your own layout glue use the shipped utilities (real names from `_ds_bundle.css`):

| Family  | Classes                                                                                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout  | `cl-stack` (+`cl-stack--xs`/`--sm`/`--lg`/`--xl`), `cl-inline` (+`cl-inline--nowrap`), `cl-spread`, `cl-grid-2`, `cl-grid-3`, `cl-grid-4`, `cl-cols cl-cols--2`, `cl-cols cl-cols--sidebar`, `cl-divider`, `cl-grow`, `cl-truncate`        |
| Type    | `cl-t-display`, `cl-t-title-1`, `cl-t-title-2`, `cl-t-title-3`, `cl-t-body`, `cl-t-body-strong`, `cl-t-body-sm`, `cl-t-label`, `cl-t-caption`, `cl-t-overline`, `cl-t-amount`, `cl-t-amount-lg`, `cl-t-mono-id`, `cl-num` (tabular digits) |
| Tone    | `cl-muted` (ink-secondary), `cl-faint`, `cl-accent`, `cl-tone-success`, `cl-tone-warning`, `cl-tone-danger`                                                                                                                                |
| Density | `cl-web` on any wrapper switches its subtree to web density                                                                                                                                                                                |

Inline styles may reference tokens, never hex: surfaces `var(--bg)`, `var(--surface)`, `var(--surface-2)` (sunken), `var(--surface-3)` (raised); lines `var(--hairline)`, `var(--border)`, `var(--border-strong)`; ink `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`; accent `var(--accent)`, `var(--accent-hover)`, `var(--accent-tint)`, `var(--accent-ink)`, `var(--on-accent)`, `var(--focus-ring)`; status `var(--success-bg)` / `var(--success-ink)` / `var(--success-dot)` and the same for `warning`, `danger`, `info`; space `var(--space-1)` … `var(--space-16)` (4-pt scale: 1=4px, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32); radius `var(--radius-xs|sm|md|lg|xl|full)`; shadow `var(--shadow-sm|md|lg)`; fonts `var(--font-sans)`, `var(--font-mono)`. Do not invent class names, do not add a second typeface, do not use gradients or emoji.

## 3. Rules that make a screen read as Clepso

- **Lists first.** Rows go in `List` › `ListRow` (with `Mono` identifiers, `Pill` status, tabular `value`). A `Card` is only for the exceptions: the running timer, Review your day, Who to nudge, a deadline, a trust warning.
- **One primary per view.** `Button variant="primary"` once; `secondary` is the companion; labels are verbs with the outcome, money with cents ("Send for $8,125.00").
- **Colour is state.** `Pill` tones: `accent` open/in progress · `success` paid/done/billable · `warning` due within 7 days, partial, written down · `danger` overdue, missed, trust anomaly · `info` court/system · `outline` attributes (Hourly, Flat fee). Never use the accent for status or a status colour as decoration.
- **Numbers are type.** `Amount` for money and hours (cents dimmed), `Mono` for matter numbers (2026-0187), invoice numbers (INV-2026-078), UTBMS codes (L110), account suffixes (····4821). `KpiTile`: at most two per phone screen, four per web page; `tint` only on the number the screen exists to move.
- **Mobile IA.** `TabBar` items Today · Matters · Calendar · Billing with Capture in the centre; `TimerBar` docks above it while a timer runs; every create/edit flow is a `Sheet` inside `Scrim` with one `Button variant="primary" size="lg" block`; detail screens use `NavBar` with a `mono` identifier; root tabs use `ScreenHeader`.
- **Web IA.** `Sidebar` groups Today, Inbox, then Work (Matters, Contacts, Calendar, Tasks, Documents) and Money (Time & expenses, Billing, Trust, Reports); `TopBar` carries ⌘K search and the running timer; pages are `PageHeader` → `Toolbar` → `Table` with a `Drawer` for the selected row.
- **AI is grey and opt-in.** `AiSuggestion` sits under the field with a plain label; nothing applies until the user taps. `Banner tone="outline"` carries disclosures.
- **Plain language for clients.** `StageTracker variant="client"` names the next dated event; never expose stage codes, timekeepers or UTBMS to clients.

## 4. Where the truth lives

Read the bound `styles.css` → `_ds_bundle.css` for every class and token; `components/<group>/<Name>/<Name>.prompt.md` for usage and a working example of each component, `<Name>.d.ts` for its props; `guidelines/README.md` for the brand book (colour, type, spacing, voice, the status vocabulary).

## 5. One idiomatic screen

```tsx
<ClepsoRoot>
  <PhoneFrame
    bottom={
      <>
        <TimerBar
          title="Estate of Harold Bennett"
          subtitle="Draft inventory schedules"
          time="00:42:17"
        />
        <TabBar
          activeKey="today"
          items={[
            { key: 'today', label: 'Today', icon: 'home' },
            { key: 'matters', label: 'Matters', icon: 'briefcase' },
            { key: 'calendar', label: 'Calendar', icon: 'calendar' },
            { key: 'billing', label: 'Billing', icon: 'receipt' },
          ]}
        />
      </>
    }
  >
    <ScreenHeader
      eyebrow="Monday, September 29"
      title="Good morning, Dana."
      actions={
        <>
          <IconButton icon="inbox" label="Inbox" badge={3} />
          <Avatar tone="accent" initials="DO" />
        </>
      }
    />
    <KpiRow style={{ marginTop: 14 }}>
      <KpiTile tint label="Billed today" value="3.4" unit="of 6h" progress={57} />
      <KpiTile label="Unbilled" value="$17,325" delta="Review & bill →" />
    </KpiRow>
    <SectionHeader title="Review your day" count={3} />
    <List>
      <ListRow
        lead={<IconWell name="phone" />}
        regular
        title="Call · Sofia Alvarez · 12 min"
        subtitle="Alvarez v. Meridian · 10:12 AM"
        trail={
          <>
            <Button variant="primary" size="sm">
              Bill 0.2h
            </Button>
            <Button variant="ghost" size="sm">
              Skip
            </Button>
          </>
        }
      />
    </List>
    <SectionHeader title="Today" action="Calendar" />
    <List>
      <ListRow
        lead={<TimeBlock main="9:30" sub="AM" />}
        title="Pretrial conference"
        subtitle={
          <>
            People v. Webb <RowSep /> Dept. 22
          </>
        }
        pill={
          <Pill tone="info" icon="gavel">
            Court
          </Pill>
        }
      />
    </List>
  </PhoneFrame>
</ClepsoRoot>
```
