"""Component guidelines → components/<Comp>/README.md. First sentence is the summary Claude Design shows."""
GUIDELINES = {
# ── Foundations ──
"Colors": """# Colors
Semantic colour tokens for light and dark, with one accent and four reserved status hues.

**Use** `surface-*` for layers, `line-*` for edges, `ink-*` for text, `accent-*` for action and selection, `status-*` for state. Never reach for the raw `neutral-*` ramp in a component.

**Themes.** Light is the default. Dark ("courthouse mode") is a designed set: canvas `#12151B`, surfaces step lighter, hairlines become `#262C36`, the accent lifts to a mint that passes 4.5:1 on dark surfaces. Do not invert light values.

**Accent.** Cobalt (`#2B52D9` light, `#88A3FF` dark) is the one accent. It means act or selected: primary buttons, the active tab, links, the current stage, the running-timer dot, selected rows. Info state is teal so court and system pills never look like the accent.

**Rules.** Text on any surface ≥ 4.5:1; icons, control edges and status dots ≥ 3:1 (see `contrast-report.md`). Status colours never decorate and never appear in charts. One accent-filled element per view.
""",
"Typography": """# Typography
Two families with strict jobs: Geist for everything you read, Geist Mono for identifiers and timers.

**Scale.** display 32/38 · title-1 28/34 · title-2 22/28 · title-3 17/24 · body 15/22 · body-sm 14/20 · label 13/18 · caption 12/16 · overline 11/16 caps · amount-lg 28/34 · amount 17/24 · mono-id 13/18 · mono-timer 40/44. Titles at 22px and above tighten to −0.02em.

**Rules.** Numbers are always tabular (`font-variant-numeric: tabular-nums`). Cents render in `ink-secondary`. Identifiers (matter/invoice numbers, UTBMS codes, account suffixes) are mono. There is no display face: the Today greeting is title-1 on mobile and display on web. Uppercase only at the 11px overline with +0.06em tracking. Hierarchy comes from size, weight (400/500/600) and space, not colour.

**Mobile.** Load with `@expo-google-fonts/geist` and `@expo-google-fonts/geist-mono`. **Web.** Google Fonts link or self-hosted woff2; fallbacks are the system stacks in `tokens.css`.
""",
"SpacingRadius": """# Spacing & radius
A 4-pt spacing scale, a 20pt mobile gutter, and four radii assigned by role.

**Spacing.** 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Rows pad 12 vertical / 16 horizontal on mobile, 8 / 14 on web. Sections are 24 apart on mobile, 32 on web. Use flex/grid `gap`, not margins on children.

**Radius.** xs 4 (checkbox, progress) · sm 6 (web controls, sidebar items, company avatars) · md 8 (mobile controls, chips) · lg 12 (cards, grouped lists, tiles, timer bar) · xl 16 (sheets, dialogs) · full (pills, person avatars, Capture). Tight radii keep the system crisp; only the device frame is rounder.

**Sizes.** Mobile control 44, input 48, row 60, tab bar 56 + inset. Web control 36, input 40, row 44 (compact 36). Sidebar 256 / 64 collapsed. Content max 1440.
""",
"Elevation": """# Elevation
Hairlines separate content; shadow is reserved for the three things that float.

**Level 0** (lists, cards, tiles): `line-hairline` border and a surface change. **shadow-sm**: segmented-control thumb, hovered web rows. **shadow-md**: popovers, dropdowns, the running-timer bar. **shadow-lg**: bottom sheets, dialogs, the Capture button.

In dark mode shadows lose most of their spread and gain a 1px hairline ring so edges stay legible. Never stack a shadow on a bordered card.
""",
"Iconography": """# Iconography
Stroke icons at 1.75px, 20px by default, 24px in tab bars, 16px inline with text.

**Library.** Phosphor Icons — Regular weight for everything, Fill weight only for the active tab. Mobile: `phosphor-react-native`; web: `@phosphor-icons/react`. The previews use an inline set drawn to the same spec.

**Rules.** Icons take `currentColor` from their text. Icon wells (36px tonal squares, 44px in the Capture sheet) hold icons that lead a row. No emoji, no gradients, no sparkles: AI is the pen icon and a text label. Deadline is the triangle alert, trust is the lock, court is the gavel.
""",
# ── Actions ──
"Button": """# Button
Six variants and three sizes; one primary per view; labels are verbs that name the outcome.

**Variants.** `primary` (accent fill) · `secondary` (tonal, the default companion) · `outline` (on busy surfaces) · `tertiary` (accent text, low emphasis) · `ghost` (dismiss) · `destructive` (tonal red) and `destructive-solid` (only the confirming step of a dialog).

**Sizes.** sm 36 (inline in rows and banners) · md 44 (mobile default) · lg 52 (the single call to action at the bottom of a sheet/form). On web, md becomes 36 and lg 44 (`.cl-web`).

**States.** hover (web) darkens; pressed scales to 0.985; focus-visible shows a 2px `focus-ring` at 2px offset; disabled is 45% opacity; loading replaces the label with a spinner and blocks input.

**Copy.** "Send invoice", "Record payment", "Bill 0.2h", "Text pay link". Money in a label always includes cents.
""",
"IconButton": """# Icon button & Capture
Round 40px icon buttons for header actions, with an optional count badge; the 56px accent Capture button.

**Icon button.** `cl-iconbtn` sits on a surface with a hairline; `--plain` for nav bars; `--sm` (32) inside cards. A `cl-badge` shows unread counts (max "99+"). Always give an `aria-label`.

**Capture.** The only raised, round, accent-filled control. Lives in the centre of the tab bar and in the web top bar. Opens the Capture sheet.
""",
"SegmentedControl": """# Segmented control
Switches between views of the same object; filters use chips instead.

Track is `surface-sunken`, the active item is `surface-default` with `shadow-sm`. Items are 32px (28 on web), label style 600. `--block` stretches across the screen (Billing tabs); `--scroll` allows overflow (matter detail tabs). Counts inside items use `cl-chip__count`.
""",
"Chips": """# Filter chips
Horizontal, scrollable filters; the selected chip is an ink fill.

32px tall (30 on web), hairline border at rest, `ink` fill with inverse text when active. Counts are tabular in `ink-tertiary`. Dropdown chips end with a chevron; applied filters end with an × and read as active. Keep the first chip "All" with the total.
""",
"Toggles": """# Switch · checkbox · radio
A 44×26 switch for settings, a 22px round check for tasks, a square check for forms, and a radio for single choice.

The task check is round so a completed task reads like a filled dot in a list, not a form field. Checked state is the accent fill with `on-accent` mark. Labels sit left of switches in a 44px `cl-option` row; helper copy goes under the label in caption style.
""",
# ── Inputs ──
"TextField": """# Text field
Label above, control, help or error below; 48px on mobile and 40 on web.

**Anatomy.** `cl-field` › `cl-field__label` (label style, ink-secondary, optional "Optional" tag) › `cl-input` (hairline `line-border`, radius md/sm) › `cl-field__help` (caption).

**States.** Focus: accent border + 3px `focus-ring`. Error: `danger-dot` border, red help text that says what to do. Disabled: `surface-sunken` with `ink-disabled`. Search: tonal, borderless, becomes a surface on focus.

**Affixes.** Leading icons in `ink-tertiary`; text affixes (currency, "/ hr") in body-strong `ink-secondary`.
""",
"AmountDuration": """# Amount · duration · date
Purpose-built inputs for money and time.

**Amount** right-aligns tabular digits with a currency affix and always shows cents; derived helper text explains the math ("1.6h × $325.00"). **Duration** is an h:mm stepper in 0.1h (6-minute) steps with the rounding rule in the help text; write-downs show the delta in warning ink. **Date** takes a calendar icon and a human date ("Mon, Sep 29"). **Activity code** is a select showing the UTBMS code in mono plus its name.
""",
"NarrativeField": """# Narrative field with AI cleanup
A textarea for billing narratives and client messages, with an opt-in, clearly labelled AI suggestion that never auto-applies.

The suggestion is a grey `cl-ai` block under the field: pen icon, "Suggested cleanup · not applied", the proposed text, and Use this / Edit / Dismiss. Nothing changes until the user taps Use this. The same block carries the disclosure sentence where a bar rule requires it. No purple, no sparkles, no auto-insertion.
""",
"Select": """# Select & pickers
Selects look like text fields with a chevron; on mobile they open a picker sheet with recent items first.

Matter pickers show the matter title and its mono number; the selected row carries an accent check. Account pickers show the account type, a lock icon for trust, and the masked suffix. Help text states the rule the picker enforces ("Retainers must go to trust").
""",
# ── Data display ──
"ListRows": """# List rows
The workhorse of the product: a 60px row with an optional leading element, a two-line body, and a trailing value/status column.

**Variants by content.** Matter (title, client · practice · mono number, deadline pill + unbilled), task (round check, due date red when overdue), time entry (h:mm + date block, narrative, code, amount + billable pill), invoice (client, mono number · matter, amount + status), contact (avatar, role · phone/email, call action), event (time block, title, location, kind pill).

**Rules.** Rows live inside `cl-list` (surface, hairline, radius 14) or a `--flat` list inside a card. Separators are 1px hairlines inset to the body (`--inset` when a leading avatar exists). Titles truncate to one line; amounts are tabular. Pressable rows show a chevron only when they open a full screen. Swipe actions: Timer (accent) and Done (success) on tasks; Bill and Skip on review items.
""",
"StatusPill": """# Status pill
A 24px tinted pill in six tones; sentence case; a dot when it is the only marker in a row.

**Tones.** neutral (draft, closed, no charge) · accent (open, in progress, on invoice) · success (paid, reconciled, done, billable) · warning (due ≤7 days, partial, written down, pending approval) · danger (overdue, missed, trust anomaly) · info (court, sync). `--ink` for the current user's filter; `--outline` for attributes (Hourly, Flat fee, Walled).

Pills describe state, never act. Text on each tone passes 4.5:1 in both themes.
""",
"StageTracker": """# Stage tracker
Shows where a matter is in its playbook; staff see a horizontal track, clients see a vertical, plain-language list.

**Staff.** Done stages are accent-filled dots joined by accent lines; the current stage has an accent ring and a bold label; upcoming stages are bordered dots. Labels are captions and truncate.

**Client.** The current stage is title-3 with a "Next:" sentence that names the next concrete event and its date. Copy comes from the playbook's approved client-status text, never from internal stage names.
""",
"Avatar": """# Avatar
Initials on a tonal surface; people are round, organisations are squared.

Sizes xs 24 · sm 28 · md 36 · lg 48 · xl 64. `--accent` marks the signed-in user; `--ink` marks a "+3" count in a stack. No random colours: identity comes from the initials and the shape.
""",
"KpiTile": """# KPI tile
A label, a tabular value with a smaller unit, and one delta or hint; at most two per mobile screen and four per web page.

`--tint` is reserved for the one number the screen exists to move (Billed today, Billed this week) and may carry a 4px progress bar. Deltas are caption style: `is-up` success ink with an up-right arrow, `is-down` danger ink with an alert. Benchmarks ("Legal Trends median 84%") go in the delta slot.
""",
"AmountsIdentifiers": """# Amounts, hours & identifiers
Money and time are first-class type.

Amounts: `cl-amount` (17/600), `--lg` (28), `--display` (32); always tabular; `.cents` in ink-secondary. Hours: one decimal in lists ("1.6h"), h:mm in editors and timers. Identifiers: `cl-mono` (Geist Mono 13). Negative adjustments are green when they favour the client (trust applied, write-down) and red when they cost them (late fee).
""",
"Table": """# Table (web)
Dense, scannable tables with overline headers, right-aligned tabular numbers and mono identifiers.

Rows are 44px (compact 36). Group rows (`cl-table__group`) carry counts and subtotals; the footer carries totals so no separate tile is needed. Hover tints a row 3%; selection uses `accent-tint`. First column may hold a square check for bulk actions. Wide tables scroll inside `cl-table-wrap`; the sticky header stays. Density is a per-table user preference.
""",
"ActivityTimeline": """# Activity timeline
A vertical feed of what happened on a matter: actor, action, object and time, with client-visible items marked.

Each event has a 28px icon in a tonal circle joined by a 2px hairline rail. Money events use the accent well. Quoted messages render in a tonal block. Times are relative for today and absolute after.
""",
"EmptyState": """# Empty state
An icon in a 52px tonal circle, a title, one sentence, and at most one action.

First-run moments ("Your first matter.") may step up to title-2; everyday empties ("Nothing to review") stay in title-3. The sentence says what will appear here and how, not that the list is empty.
""",
"Skeleton": """# Loading & offline
Skeleton rows keep the layout stable while data loads; offline is a state with a one-line banner, never an error.

Skeletons mirror the row anatomy (circle, two lines, trailing block) with a slow shimmer that respects reduced motion. The offline banner is compact and outline-toned, shows the queued count, and turns success on reconnect. Timers keep running while offline.
""",
"Charts": """# Charts
Thin marks, rounded data ends, recessive grid, tabular labels, and colour assigned by job.

Single series use the accent and need no legend. Magnitude (AR aging, heatmaps) uses the single-hue `chart-seq-*` ramp with a 2px gap between segments. Categories use `chart-cat-1…6` in fixed order (validated for colour-vision deficiency); a seventh folds into "Other". Status colours never appear in charts. In the product every chart has a hover tooltip, a table view, and a goal or benchmark line where one exists.
""",
# ── Feedback ──
"Banner": """# Banner
Inline, contextual messages at the top of the content they concern.

Tones follow the status rules; `--outline` is for information that must be present but not alarming (AI disclosure, ethical walls); `--accent` is for opportunities (missed-call text-back). Title in body-strong, text in label, up to two small buttons. `--compact` is one line with no actions. Banners never stack more than two.
""",
"Toast": """# Toast
A one-line confirmation on the inverse surface, optional Undo, auto-dismiss after 4 seconds.

Use for completed actions ("Time entry saved · 1.6h to Estate of Bennett"). Errors that need a decision use a dialog or an inline banner, not a toast. Queued-offline states use the danger icon but stay calm in copy.
""",
"Dialog": """# Dialog
A confirmation with the consequence in the body and the verb on the button.

Title asks the question with the amount or object in it ("Send invoice for $8,125.00?"). Body states what happens next and anything irreversible. Actions: a ghost dismiss and one primary (or destructive-solid) verb. Max width 360; the surface is `surface-raised` with `shadow-lg`.
""",
"BottomSheet": """# Bottom sheet
Every create and edit flow on mobile is a sheet: grabber, title row, form, one primary button at the bottom.

Surface is `surface-raised`, radius 20 on top, `shadow-lg`. The primary button is `lg` and full width and names the outcome with the amount ("Record $8,125.00"). Sheets support a half and full detent; the form starts at the detent that shows the first field and the button.
""",
# ── Navigation ──
"TabBar": """# Tab bar
Four destinations plus Capture: Today · Matters · [Capture] · Calendar · Billing.

56px plus the home-indicator inset, `surface-default` with a hairline top. Inactive tabs are `ink-secondary`, the active tab is the accent with a slightly heavier stroke. Capture is a 52px accent circle raised 14px. The running-timer bar docks 8px above the tab bar on every screen while a timer runs.

**Evolution.** Inbox (leads, client messages, approvals) is a header icon with a badge in H1; in H2 it takes the Calendar slot and the agenda folds into Today.
""",
"MobileHeader": """# Mobile headers
Root tabs use a large title with an eyebrow and round icon actions; detail screens use a compact nav bar with the identifier in mono.

Root: eyebrow (label, ink-secondary) over title-1 (the greeting on Today is title-1 too); up to two 40px icon buttons and the avatar on the right. Detail: back label in accent, mono identifier centred, plain icon buttons right; the object title (title-2) and its metadata follow in the body so the nav bar stays short when scrolling.
""",
"Sidebar": """# Sidebar (web)
256px navigation grouped by job: Today and Inbox first, then Work (matters, contacts, calendar, tasks, documents) and Money (time, billing, trust, reports).

Items are 34px with an 18px icon; active item is `surface-default` with a hairline ring and an accent icon. Counts are tabular in `ink-tertiary`; Inbox uses an accent badge. Collapses to 64px icons with tooltips. The firm switcher sits at the top, settings and the user at the bottom.
""",
"TopBar": """# Top bar (web)
56px: sidebar toggle, a ⌘K command search, and on the right the running-timer widget, Capture, alerts and the profile.

The command palette accepts objects and verbs ("Bennett", "start timer", "new invoice"). The timer widget is an accent-tint pill with the matter, mono time and pause/stop; it is present on every page while a timer runs.
""",
"PageHeader": """# Page header (web)
Breadcrumbs (with the identifier in mono), a title-2 title, metadata pills, actions on the right, and in-page tabs below.

Today uses the display-size greeting (`cl-h1--greeting`) instead of a title. Actions: up to two secondary buttons, one primary, and a more menu. Tabs are a segmented control with counts.
""",
# ── Domain ──
"TimerBar": """# Running timer
The product's heartbeat: a docked bar above the tab bar, a hero timer in the Capture flow, and a list for multiple timers.

**Bar.** `surface-raised` with `shadow-md`, a pulsing accent dot, matter title and description, mono time, pause and stop. Paused state swaps the dot to warning and the primary action to resume. **Hero.** 40px mono digits with dimmed leading zeros, a matter chip row, an optional description, one large Start button. Timers persist across app kill and sync across devices; stopping opens Log time pre-filled.
""",
"CaptureSheet": """# Capture sheet
The one place to record work: Start timer, Voice memo, Log time, Expense, Task, Note, with the matter pre-selected from context.

A 3×2 grid of 44px accent wells for the three time actions and tonal wells for the rest; a Recent matters chip row underneath. Voice memo records with on-device transcription and understands "matter, tenths, description". Opens from the tab-bar Capture button, the web top bar, and a long-press on any matter row.
""",
"ReviewDayCard": """# Review your day
Turns passive signals (calls, calendar events, texts, voice memos) into billed time with one tap per item.

Card header with the count and the total suggested hours in an accent pill. Each row: icon well for the source, what happened and when, and Bill x.xh / Skip. "Bill" creates the entry silently; "Skip" teaches the model. When empty it says how many hours were billed today and turns success.
""",
"ArNudgeCard": """# Who to nudge
Receivables with the next action attached: who, how much, how late, what now.

Rows show the client avatar, invoice number in mono, the pay-link state ("opened, not paid"), the amount and days late (danger ink only past due). Footer actions: Text pay link (primary, ACH-first) and Offer a plan (secondary). Lives on Today and at the top of Billing.
""",
"TrustBalanceCard": """# Trust balance
Per-matter trust with the account suffix, reconciliation status and compliance timers.

The balance is amount-lg; a success pill confirms the last 3-way match; key/value rows show reconciliation date, last deposit and pending disbursements; actions are Ledger, Audit pack, Disburse. The warning variant carries a compliance timer (14-day notice, 45-day disbursement) with the rule cited and a Send notice action. Anomalies (commingling, ledger mismatch) block disbursement and use the danger banner.
""",
"InvoiceSummary": """# Invoice summary
The invoice as an object: mono number, status pill, display-size total, who and what, line items, pay-link state.

Line items are a flat list with the narrative, timekeeper × rate, and tabular amounts; the list footer shows the pay-link history with a Resend link. Actions are Record payment, Text pay link and Offer a payment plan. Overdue invoices show days late in the pill and the due date in danger ink.
""",
# ── Screens ──
"MobileToday": """# Today (mobile)
The daily loop on one screen: what to bill, where to be, who to nudge.

Order is fixed: greeting → two KPI tiles (Billed today tinted, Unbilled) → Review your day → Today agenda → Who to nudge. The running-timer bar docks above the tabs. Everything here is one tap from an outcome (Bill, Text pay link) so a lawyer can clear the day between hearings.
""",
"MobileMatters": """# Matters (mobile)
A grouped list: Needs attention (deadline within 7 days, hearing today, overdue AR) first, then Active sorted by recency.

Search and filter chips sit under the large title. Rows show the deadline or stage pill and unbilled amount so nothing needs a second tap to triage. Long-press a row for Capture on that matter.
""",
"MobileMatterDetail": """# Matter detail (mobile)
Identity, stage, next deadline and money before the work.

Nav bar with the mono number; title-2 name; client · practice · attorney; attribute pills. Then the stage tracker, in-page tabs, the deadline banner, three mini KPI tiles (Unbilled, Trust, Hours), open tasks and recent time. The footer keeps Log time, Message and Invoice within thumb reach.
""",
"MobileCapture": """# Capture sheet over Today
Capture opens as a sheet over whatever the lawyer was doing; the matter is pre-selected from context (the matter they were viewing, else the last one used).
""",
"MobileLogTime": """# Log time (mobile)
Stopping a timer lands here with matter, duration, date and rate filled; the lawyer only writes the narrative.

Duration is the h:mm stepper with the rounding rule stated; amount is derived and shown. The AI cleanup suggestion sits under the narrative and is never applied automatically. The save button repeats the hours and amount.
""",
"MobileBilling": """# Billing (mobile)
Bill and collect entirely from the phone: Unbilled · Invoices · Payments · Trust as segments.

Two KPI tiles (Outstanding with overdue, Collected 30d), a tinted Ready to bill card with one Create invoices action, then the invoice list with amount and status. This screen is the answer to every incumbent's "no bill creation on mobile".
""",
"MobileInvoice": """# Invoice · text-to-pay (mobile)
Status, display-size total, dates, pay-link state, line items and activity; two actions that get the firm paid.

Overdue shows days late in the pill and the due date in danger ink. Trust available is shown with an apply link. Footer: Record payment (secondary), Text pay link (primary), Offer a payment plan (tertiary).
""",
"MobileClientApp": """# Client app · case status
The client-facing app shares the tokens but softens the voice: firm name in the header, the case title in title-1, a plain-language stage tracker with the next dated event, the last message from the attorney, and the balance with a fee-free Pay action.

Tabs are Case · Messages · Upload · Payments. Nothing internal (stage codes, timekeepers, UTBMS) is ever visible here.
""",
"MobileSignIn": """# Sign in
Biometric continuation is the primary action; email and password are the fallback.

The Clepso mark and wordmark, the greeting and the last-seen line make it personal; the footnote states the session policy (stays signed in; locks after 15 minutes in court mode). Forced re-login is the incumbents' top one-star theme, so this screen should rarely be seen.
""",
"WebDashboard": """# Today (web)
The same daily loop as mobile with room for numbers: four KPI tiles, Review your day and the agenda on the left, hours chart, Who to nudge and upcoming deadlines on the right.

The greeting is the only display-size text; the Me/Firm segment switches the scope of every tile.
""",
"WebMatters": """# Matters (web)
A dense table with a detail drawer, so triage never needs a second click.

Toolbar: search, filter chips, density. Table: grouped (Needs attention / Active), with stage, responsible, unbilled, trust and next deadline; footer totals. The drawer shows the selected matter's identity, stage tracker, deadline banner, mini KPIs, open tasks, people and the three quick actions; the arrow opens the full page.
""",
"WebPrebill": """# Pre-bill review (web)
Unbilled time grouped by matter with write-downs inline and invoices generated in one click.

Four KPI tiles (Unbilled, Write-downs, Ready to invoice, Trust to apply), an outline banner for pending AI narrative suggestions, and a compact table grouped by matter with subtotal and approval pills. Flat-fee matters show milestones and "earned on receipt"; tracked-only time shows without a rate.
""",
}
