# Clepso — design system

Clepso is the design system for the Clepso law-firm practice management platform: the staff app (Expo, iOS + Android), the staff web app that follows, and the client app after that. It is light-first, list-first, cobalt on graphite, and built around the four things the feature strategy says decide a small firm's revenue: capturing time, getting paid, answering leads and keeping clients informed. Everything here is generated from `design/src` by `python3 design/src/build.py`; edit the sources, never the output.

## Start here

- **This README** — principles, voice, foundations, layout rules, the component index.
- `tokens.json` — every token with a usage note (light + dark; the accent, status, charts, type, spacing, radius, shadow, sizes, motion, breakpoints).
- `tokens.css` — the same tokens as CSS custom properties: light by default, dark under `prefers-color-scheme` and `[data-theme="dark"]`, scoped themes via `.cl-theme-light` / `.cl-theme-dark`.
- `components/bundle.css` — the component classes (`cl-*`) that every preview and screen uses.
- `components/<Name>/preview.html` + `README.md` — one card per component or screen; the first line of each preview is the `@dsCard` marker.
- `contrast-report.md` — WCAG ratios for every pairing the components use. All pass.
- `preview.html` — the whole system on one page with a theme switch.

## Principles

1. **Built for the hallway.** One-handed reach, 44pt targets, the primary action at the thumb, state you can read at a glance, and a dark theme (“courthouse mode”) that does not light up a courtroom. Nothing destructive is one tap.
2. **Money and time are type.** Amounts, hours and identifiers have their own styles: tabular figures, dimmed cents, mono numbers. Every amount has a status next to it; every hour has a rate behind it.
3. **Lists first, cards for the exception.** Grouped lists with hairline separators carry the product. A card marks the one thing that is not a list item: the running timer, Review your day, a deadline, a trust warning.
4. **Colour is a promise.** Cobalt means act or selected. Green means paid or done. Amber means within a week. Red means late or at risk. Teal means court or system. Nothing else is coloured.
5. **Plain language, disclosed AI.** Client-facing copy names the next dated event. AI suggestions are grey, labelled and applied only by hand.
6. **One system, three surfaces.** The same tokens drive mobile, web and the client app. Web adds density and multi-pane layout; the client app softens the voice.

## Voice and copy

- Write from the lawyer's side of the screen: _Bill 0.2h_, _Text pay link_, _Record payment_, _Mark filed_. Verbs name the outcome; money in a label always includes cents.
- Client-facing copy is plain English at a general-reading level and always states the next concrete event with a date: “Next: we file the estate inventory with the court by Oct 3. Nothing is needed from you.” Never expose stage codes, timekeepers or UTBMS codes to clients.
- Errors say what went wrong and what to do (“Already used by Estate of Harold Bennett”). Offline is a state (“Offline · changes will sync”), not an error.
- Dates: “Mon, Sep 29”, “Oct 3”, “46 days late”. Hours: one decimal in lists (1.6h), h:mm in editors and timers. Identifiers keep their real format (2026-0187, INV-2026-078, L110).
- Sentence case everywhere except the 11px overline.

## Foundations

### Colour

Neutrals are a cool graphite ramp (hue ≈ 222°) so the accent owns colour. Components use only semantic tokens.

| Role                                   | Light              | Dark      | Token                            |
| -------------------------------------- | ------------------ | --------- | -------------------------------- |
| Canvas                                 | `#F7F8FA`          | `#12151B` | `surface-canvas` (`--bg`)        |
| Surface (lists, cards, inputs)         | `#FFFFFF`          | `#191D25` | `surface-default` (`--surface`)  |
| Sunken (tonal buttons, search, tracks) | `#F0F2F5`          | `#0E1015` | `surface-sunken` (`--surface-2`) |
| Raised (sheets, popovers, timer bar)   | `#FFFFFF` + shadow | `#1F242D` | `surface-raised` (`--surface-3`) |
| Hairline                               | `#E1E5EB`          | `#262C36` | `line-hairline`                  |
| Border (inputs, chips)                 | `#CDD3DC`          | `#353C48` | `line-border`                    |
| Ink                                    | `#1C2029`          | `#EEF0F4` | `ink-primary`                    |
| Ink secondary                          | `#5B6472`          | `#A9B1BE` | `ink-secondary`                  |
| Ink tertiary (≥3:1 only)               | `#7F8897`          | `#7F8897` | `ink-tertiary`                   |

**Accent — Cobalt.** Light `#2B52D9` / hover `#2446BF` / pressed `#1D3AA3` / tint `#E7ECFB` / on-tint `#1F3FAF` / focus ring `#2B52D959`. Dark `#88A3FF` / hover `#9FB5FF` / pressed `#7190F5` / tint `#1E2A4A` / on-tint `#B5C6FF` / on-primary `#0A1440`. One accent-filled element per view; the accent never carries state.

**Status** (bg / ink / dot, light → dark): success `#E4F4EA` `#176A3E` `#23A25C` → `#173126` `#6ED39A` `#3DBE76` · warning `#FBEFD6` `#7D4F00` `#B87900` → `#3A2D14` `#F4C160` `#E8A93A` · danger `#FBE7E5` `#A8271F` `#D9382E` → `#3D1E1C` `#FF8B80` `#F0564A` · info (teal) `#DDF3F0` `#0E5F57` `#12857A` → `#133430` `#66D1C3` `#2DB3A4`. Each also has a `solid` fill and `on` text for solid buttons and badges. Info is teal on purpose: court and system pills must never read as the cobalt accent.

**Domain mapping.** Matter: open → accent, pending → warning, closed → neutral. Invoice: draft → neutral, sent → info, partial → warning, overdue → danger, paid → success. Deadline: > 7 days → neutral, ≤ 7 days → warning, today or missed → danger. Time: billable → success, no charge → neutral, written down → warning, on invoice → accent. Trust: reconciled → success, unreconciled > 30 days → warning, anomaly → danger.

**Charts.** Single series = cobalt. Magnitude = `chart-seq-1…6` (one cobalt ramp, light → dark). Categories = `chart-cat-1…6` (cobalt, orange, teal, violet, ochre, magenta) in fixed order, validated for colour-vision deficiency; a seventh folds into “Other”. Status colours never appear in charts.

### Type

| Style              | Face       | Size / line       | Weight             | Use                                                     |
| ------------------ | ---------- | ----------------- | ------------------ | ------------------------------------------------------- |
| display            | Geist      | 32 / 38           | 600                | The Today greeting on web, hero numbers, invoice totals |
| title-1            | Geist      | 28 / 34           | 600                | Mobile screen titles and the Today greeting             |
| title-2            | Geist      | 22 / 28           | 600                | Web page titles, sheet titles, matter names             |
| title-3            | Geist      | 17 / 24           | 600                | Card and section titles                                 |
| body / body-strong | Geist      | 15 / 22           | 400 / 600          | Mobile default; row titles                              |
| body-sm            | Geist      | 14 / 20           | 400                | Web tables, drawers, sidebars                           |
| label              | Geist      | 13 / 18           | 500                | Field labels, metadata, subtitles                       |
| caption            | Geist      | 12 / 16           | 500                | Timestamps, help text, pills                            |
| overline           | Geist      | 11 / 16           | 600, caps, +0.06em | Section eyebrows, table headers                         |
| amount-lg / amount | Geist      | 28 / 34 · 17 / 24 | 600, tabular       | Totals; amounts and hours in rows                       |
| mono-id            | Geist Mono | 13 / 18           | 500                | Matter and invoice numbers, codes, account suffixes     |
| mono-timer         | Geist Mono | 40 / 44           | 500                | Running timer                                           |

Rules: numbers are always tabular; cents in `ink-secondary`; titles at 22px and above tighten to −0.02em; no display face (the greeting is title-1 on mobile, display on web); uppercase only at the overline; hierarchy from size, weight and space, not colour. Fonts: `@expo-google-fonts/geist` and `@expo-google-fonts/geist-mono` on mobile; Google Fonts or self-hosted woff2 on web; fallbacks in `tokens.css`.

### Space, radius, size, elevation, motion

- **Spacing** 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Mobile gutter 20. Rows 12 / 16 (mobile), 8 / 14 (web). Sections 24 apart on mobile, 32 on web.
- **Radius** xs 4 · sm 6 · md 8 · lg 12 · xl 16 · full. Controls 8 (mobile) / 6 (web); cards, lists and tiles 12; sheets 16; pills, person avatars and Capture round; company avatars 8.
- **Sizes** mobile control 44, input 48, row 60, tab bar 56 + inset, Capture 56; web control 36, input 40, row 44 (compact 36); sidebar 256 / 64; content max 1440. Breakpoints 640 / 768 / 1024 / 1280 / 1536.
- **Brand mark** a cobalt tile (radius 8 / 12) with a “C” arc at 2.75px stroke, next to the Geist wordmark at title-2 weight 600, −0.03em. Placeholder until a considered logo exists; never on client-facing marketing.
- **Elevation** hairlines separate content; `shadow-sm` thumb and hover, `shadow-md` popovers and the timer bar, `shadow-lg` sheets, dialogs and Capture. Dark mode adds a 1px hairline ring.
- **Motion** 120ms press and toggles, 200ms content, 320ms sheets and drawers; `cubic-bezier(.2,.8,.2,1)`; reduced-motion disables the timer pulse and shimmer.

### Iconography

Phosphor Icons, Regular weight (Fill for the active tab), 1.75px stroke, 20px default, 24px in tab bars, 16px inline. Icons take `currentColor`. No emoji, no gradients, no sparkles: AI is the pen icon plus a label; deadline is the alert triangle; trust is the lock; court is the gavel.

## Layout

**Mobile.** Root tabs use a large title (the greeting on Today is the same title-1) with round icon actions; detail screens use a compact nav bar with the identifier in mono. Content is a column of sections: an optional KPI pair, then grouped lists. Cards only for the exceptions above. Every create/edit flow is a bottom sheet with one `lg` primary button. The tab bar is Today · Matters · Capture · Calendar · Billing; the running-timer bar docks above it on every screen. Inbox is a header icon in H1 and earns the Calendar slot in H2.

**Web.** A 256px sidebar grouped into Today, Inbox, Work (matters, contacts, calendar, tasks, documents) and Money (time, billing, trust, reports); a 56px top bar with ⌘K search, the timer widget, Capture, alerts and profile. Pages have breadcrumbs, a title-2 title, actions and in-page tabs. Lists become tables with a detail drawer; density is a per-table preference. Everything else is the mobile library at web density (`.cl-web`).

**Client app.** Same tokens, softer voice: firm name in the header, the case title in title-1, the vertical plain-language stage tracker, the last message, and the balance with a fee-free Pay action. Tabs: Case · Messages · Upload · Payments.

## Component index

Foundations: Colors · Typography · SpacingRadius · Elevation · Iconography
Actions: Button · IconButton · SegmentedControl · Chips · Toggles
Inputs: TextField · AmountDuration · NarrativeField · Select
Data display: ListRows · StatusPill · StageTracker · Avatar · KpiTile · AmountsIdentifiers · Table · ActivityTimeline · EmptyState · Skeleton · Charts
Feedback: Banner · Toast · Dialog · BottomSheet
Navigation: TabBar · MobileHeader · Sidebar · TopBar · PageHeader
Domain: TimerBar · CaptureSheet · ReviewDayCard · ArNudgeCard · TrustBalanceCard · InvoiceSummary
Screens · Mobile: MobileToday · MobileMatters · MobileMatterDetail · MobileCapture · MobileLogTime · MobileBilling · MobileInvoice · MobileClientApp · MobileSignIn
Screens · Web: WebDashboard · WebMatters · WebPrebill

Each lives at `components/<Name>/` with a `README.md` (guidelines; first sentence is the summary) and a `preview.html`.

## Accessibility

Text ≥ 4.5:1 and edges, icons and markers ≥ 3:1 on every surface in both themes (`contrast-report.md`). Status is never colour alone: a pill always has text, a dot is redundant to text. Focus is a 2px accent ring at 2px offset on every control. Tap targets ≥ 44pt. Reduced motion is respected. Dynamic Type / font scaling is supported up to 130% without truncating amounts.

## Don't

Card-per-row lists · shadows on bordered cards · the accent for status or status colours for series · uppercase labels below the overline · a second typeface in product screens · purple or sparkle AI treatment · left-border accent rails · emoji · random avatar colours · numbers without tabular figures · hard-coded hex in components.
