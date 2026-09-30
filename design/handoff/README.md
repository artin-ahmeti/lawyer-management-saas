# Handoff: Clepso H1 mobile — "Bill from the courthouse"
## Overview
Horizon 1 of the Clepso staff app for small law firms: sign in, Today (Review your day, agenda, Who to nudge), Capture and its six flows, Matters and matter detail, Calendar, Billing (unbilled → invoices → payments → trust), Invoice detail with text-to-pay, Contacts, Settings, and a courthouse-mode (dark) twin of every screen. The clickable flow is *Today → Bill 0.2h → Save → Billing → INV-2026-078 → Text pay link → Payment received*.

## About the design files
`H1 Mobile Prototype.dc.html` is a **design reference built in HTML/React DOM**. It composes the published `@lawfirm/ui-web` components (bundled as `window.Clepso`) and is not production code. The job is to **recreate these screens in `apps/mobile` (Expo SDK 57, expo-router, NativeWind)** using the Clepso tokens and a React Native port of the same component vocabulary. Nothing here ships as-is.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, copy and status vocabulary are final and come from `design/system/tokens.json` + `design/system/README.md` on branch `design/clepso-design-system`. Recreate pixel-perfectly.

## Where things live in the repo (branch `design/clepso-design-system`)
- `design/system/README.md` — brand book (principles, voice, colour, type, spacing, status mapping). Read first.
- `design/system/tokens.json` / `tokens.css` — every token, light + dark. Single source of truth.
- `design/system/components/bundle.css` — the `cl-*` classes; use as the spec for each RN component's measurements.
- `packages/ui-web/src` + `docs/*.md` — the 81 web components and their props contracts. The RN library should mirror these props 1:1.
- `design/src/screens/m1…m9-*.html` — the nine reference screens; this prototype extends them.
- `apps/mobile/src/mocks/data.ts` — domain shapes. Extend with the fields below.
- `apps/mobile/app/**` — current routes (Home, Matters, Tasks, Time, Billing). They are replaced by the IA below.

## Implementation steps

### 1. Tokens → `packages/ui`
Replace `packages/ui/src/tokens.ts` (old dark-amber palette) with the Clepso tokens, generated from `design/system/tokens.json` so both themes are present:
- Light: canvas `#F7F8FA`, surface `#FFFFFF`, sunken `#F0F2F5`, raised `#FFFFFF`+shadow, hairline `#E1E5EB`, border `#CDD3DC`, ink `#1C2029`, ink-2 `#5B6472`, ink-3 `#7F8897`, accent `#2B52D9` / hover `#2446BF` / pressed `#1D3AA3` / tint `#E7ECFB` / on-tint `#1F3FAF`.
- Dark (courthouse): canvas `#12151B`, surface `#191D25`, sunken `#0E1015`, raised `#1F242D`, hairline `#262C36`, border `#353C48`, ink `#EEF0F4`, ink-2 `#A9B1BE`, accent `#88A3FF` / tint `#1E2A4A` / on-tint `#B5C6FF` / on-primary `#0A1440`.
- Status bg/ink/dot: success `#E4F4EA #176A3E #23A25C` (dark `#173126 #6ED39A #3DBE76`); warning `#FBEFD6 #7D4F00 #B87900` (`#3A2D14 #F4C160 #E8A93A`); danger `#FBE7E5 #A8271F #D9382E` (`#3D1E1C #FF8B80 #F0564A`); info/teal `#DDF3F0 #0E5F57 #12857A` (`#133430 #66D1C3 #2DB3A4`).
- Spacing 2·4·8·12·16·20·24·32·40·48·64. Radius xs 4 · sm 6 · md 8 · lg 12 · xl 16 · full. Mobile: control 44, input 48, row 60, tab bar 56 + inset, Capture 56, gutter 20.
- Type (Geist / Geist Mono via `@expo-google-fonts/geist`, `@expo-google-fonts/geist-mono`): title-1 28/34 600 · title-2 22/28 600 (−0.02em) · title-3 17/24 600 · body 15/22 400 · body-strong 15/22 600 · label 13/18 500 · caption 12/16 500 · overline 11/16 600 caps +0.06em · amount 17/24 600 tabular · amount-lg 28/34 · mono-id 13/18 500 · mono-timer 40/44 500. Tabular figures everywhere numbers appear.
Update `tailwind-preset.cjs` to mirror them; theme switching via a `ClepsoRoot` provider (`theme: 'light' | 'dark'`) rather than the OS setting alone (courthouse mode is a user toggle in Settings).

### 2. Component library → `packages/ui` (RN)
Port the components used by this prototype, keeping the `packages/ui-web` prop names so web and mobile share docs:
ClepsoRoot, PhoneFrame (dev only), TabBar (+CaptureButton), TimerBar, TimerHero, NavBar, ScreenHeader, SectionHeader, List/ListRow/RowSep, KpiRow/KpiTile, Card, Pill, Amount, Mono, Text, Icon (Phosphor Regular, 1.75px stroke; names in `packages/ui-web/docs/Icon.md`), IconWell, IconButton, Avatar, Button/ButtonRow, Chip/ChipGroup, SegmentedControl, Checkbox, Radio, Switch, OptionRow, Field/Form/FormRow, Input, Select, Stepper, Textarea, AiSuggestion, Banner, Toast, Dialog, Sheet (+Scrim), StageTracker, Timeline, KeyValue, EmptyState, Skeleton/SkeletonRow, TimeBlock, Dot, CaptureGrid, BrandMark, Wordmark.
Measurements: take them from `bundle.css` (e.g. `.cl-row` min-height 60, padding 12 16; `.cl-pill` height 24, radius full, caption type; `.cl-kpi` padding 14 16 radius 12; `.cl-sheet` radius 16 top, grabber 36×4; `.cl-timerbar` raised surface + shadow-md, dot 8px pulsing 1.2s).

### 3. Navigation → `apps/mobile/app`
- Tabs: `today`, `matters`, `calendar`, `billing`; centre Capture button opens the Capture sheet (not a route).
- Stacks: `matters/[id]` (tabs Overview · Activity · Tasks · Time · Docs · Billing), `billing/invoices/[id]`, `contacts`, `contacts/[id]`, `settings`.
- Sheets (modal presentation): capture, start-timer, voice-memo, log-time, expense, task, note, record-payment, payment-plan, new-matter.
- Dialogs: text-pay-link, stop-timer.
- Remove the `tasks` and `time` tabs; their content moves into matter detail and Capture.
- `TimerBar` renders in the tab layout above the tab bar whenever `timerStore.running`, on every screen including detail stacks (where the footer `ButtonRow` sits below it).

### 4. Screens (all wrapped in `ClepsoRoot`, 20px gutters, one primary button per view)
Open the prototype and use the screen board; each state is labelled `H1 · Mobile · Section · Screen · state`, light beside dark.

**Sign in** — BrandMark lg accent + Wordmark; title-1 34px "Welcome back."; body muted "Tran & Okafor LLP · you were last here yesterday at 6:12 PM."; primary lg block `face` "Continue with Face ID"; "or" divider; Email/Password fields; secondary lg block "Sign in"; caption "You stay signed in on this device. Sessions lock after 15 minutes in courthouse mode." No tab bar.

**Today** — ScreenHeader eyebrow "Monday, September 29", title "Good morning, Dana.", actions inbox (badge 3) + accent avatar DO (→ Settings). Offline: compact info Banner `wifi-off` "Offline · changes will sync", trailing pill "2 queued". KpiRow: tint tile "Billed today" value h.h unit "of 6h" progress; tile "Unbilled" $17,325 delta accent "Review & bill →" (→ Billing · Unbilled). Section "Review your day" (count) → List of rows with IconWell (phone/calendar/mic), regular title "Call · Sofia Alvarez · 12 min", subtitle "Alvarez v. Meridian · 10:12 AM", trail `primary sm` "Bill 0.2h" + `ghost sm` "Skip"; empty → EmptyState `clock` "Nothing to review" / "Calls, meetings and voice memos you haven't billed will show up here." Section "Today" action "Calendar" → agenda rows with TimeBlock, pills Court (info, gavel) / Meeting (neutral) / "4 days" (warning dot). Section "Who to nudge" action "All AR" → Avatar row Margaret Bennett, `INV-2026-078 · link opened`, value $8,125.00, meta "46 days late" danger; after payment → EmptyState `check` "Nobody to nudge".

**Capture sheet** — Sheet title "Capture", headerRight label "to **Estate of Bennett**"; CaptureGrid (Start timer / Voice memo / Log time accent; Expense / Task / Note neutral); ChipGroup "Recent" + matter chips.

**Start timer** — TimerHero (00:00:00 or running), matter chips, Activity Select `L110 Fact investigation`; not running: primary lg block "Start timer for People v. Webb"; running: ButtonRow Pause · primary "Stop & log" → Dialog "Stop timer at 0:42?" → Log time pre-filled.

**Voice memo** — IconWell mic accent round lg, waveform bars (3px, accent / border), mono "0:14"; overline "Transcript"; body quote; AiSuggestion "Parsed into an entry · not applied" → "**Estate of Harold Bennett** · 0.3h · L110 · Reviewed appraiser's report; reconciled Inventory Schedule B to appraised values." actions Use this / Edit / Dismiss; outline Banner `pen` "Transcribed on device · nothing is saved until you tap Log"; primary lg block "Log 0.3h to Estate of Bennett".

**Log time** — Form: Matter Select (value + mono number); FormRow Duration Stepper h:mm (±6 min, help "From the 12-min call · rounds to 0.2h") + Amount input `$` read-only (help "0.2h × $425.00"); FormRow Date · Activity Select code; Narrative Textarea + AiSuggestion "Suggested cleanup · not applied" (Use this replaces text; never auto-applied); OptionRow Billable Switch (off → hint "Saved as no charge"). Primary lg block "Save 0.2h · $85.00" (or "Save 0.2h · no charge"). On save: Toast "Time entry saved · 0.2h to Alvarez v. Meridian" with Undo; row leaves Review your day; Billed today increments.

**Expense** — dashed receipt slot (96px, `border-strong` dashed, sunken bg, camera icon + "Photograph the receipt · amount is read for you"); Amount/Date; Matter; Description; AiSuggestion "Read from receipt · not applied"; OptionRow "Bill to client"; primary "Save expense · $435.00".
**Task** — Task, Matter, Due/Assign to, Remind me; primary "Add task".
**Note** — Textarea, Matter, "Visible to client" off; primary "Save note". **Courthouse variant "Quick note"**: headerRight info pill `gavel` "Dept. 22", subtitle "People v. Webb · pretrial · timer keeps running", taller textarea, AiSuggestion "Found in your note · not applied" offering "Add both" (hearing + task).

**Matters** — ScreenHeader "Matters", actions `users` (Contacts) + `plus` (New matter). Search input (tonal). ChipGroup All 12 · Mine 5 · Open · Pending · Closed. Section "Needs attention" (2): Bennett (warning dot "Filing · Oct 3", meta "$4,825.00 unbilled"), Webb (danger dot "Hearing 9:30", meta "Pretrial"). Section "Active" (7) action "Sort · Recent": Alvarez (accent "Discovery" / "Cutoff Oct 24"), Kessler ("Diligence" / "$12,500.00 unbilled"), Delgado ("Disclosures" / "Plan 2 of 4"), Okonkwo ("Filed" / "RFE window Oct 11"), Nguyen (neutral "Closed" / "Paid Jul 18"). Subtitle = client · practice · Mono number. Long-press → Capture pre-pointed at the matter.

**New matter** — Sheet; Field "Playbook" (help "Stages, deadlines and the billing model come from the playbook.") → List of OptionRow radios: Probate "6 stages · hourly · Prob. Code deadlines", Personal injury, Family, Criminal defense, Immigration; Client input (help "Conflict check runs as you type."); Matter name; primary "Create matter · 2026-0215".

**Matter detail** — NavBar back "Matters", mono title `2026-0187`, actions play (start timer) + more. Title-2 name; label line "Margaret Bennett · Probate · L. Tran"; pills Open (accent) · "Hourly · $325" (outline) · Walled (outline, shield). StageTracker (staff). SegmentedControl scroll: Overview · Activity · Tasks (count) · Time · Docs · Billing. Overview: deadline Banner (warning ≤7d, neutral >7d, info for a court date today) with primary sm "Mark filed" + ghost "Add to calendar"; KpiRow Unbilled ($4,825, delta "42.6h · 18 entries") + Trust ($18,240, delta "IOLTA ····4821"); "Open tasks" list (round Checkbox, regular title, who, due meta warning/danger); "Recent time" (TimeBlock 1:36 / Sep 29, Mono code, value). Activity → Timeline. Time → list with footer "Unbilled" Amount. Docs → folders (IconWell folder, "4 files", chevron) + recent files with `link` "Share" (Toast "Share link copied · expires in 7 days"). Billing → KpiRow, invoices for the matter, trust rows. Footer ButtonRow (canvas bg, hairline top): Log time · Message · primary Invoice; TimerBar above it when running.

**Calendar** — ScreenHeader, SegmentedControl block Agenda · Month. Agenda: a SectionHeader per day ("Today · Mon, Sep 29", "Wed, Oct 1"…) with TimeBlock rows; danger compact Banner "Two court events overlap Wed, Oct 1" with chevron; deadline rows with Mono/section refs and countdown pills (warning ≤7d, neutral otherwise). Month: title-3 month + plain chevron IconButtons; 7-col grid in a surface card (day numbers label type, today = accent circle with on-accent text, out-of-month days ink-3, Dot markers under the number); Section "Deadline chains" → rows with alert IconWell and chained dates.

**Billing** — ScreenHeader, SegmentedControl block Unbilled · Invoices · Payments · Trust.
Invoices: KpiRow Outstanding $33,125 (delta "$8,125 overdue" down, alert) · Collected · 30d $12,450 (delta "18%" up); after payment $25,000 / "Nothing overdue" (up, check). Card tone tint "Ready to bill" / "3 matters · $17,325.00 unbilled · oldest 31 days", headerAction primary sm "Review". List: client title, Mono number · matter, value, pill (Overdue 46d danger dot · Sent · due Oct 9 info · Draft neutral · Partial warning dot · Paid Jul 18 success dot).
Unbilled: KpiRow tint Unbilled $17,325 · Written down $162; per-matter List with TimeBlock rows, one row with warning pill "Written down" and $0.00, footer "Bill" Amount; primary lg block "Generate 3 invoices · $17,325.00".
Payments: KpiRow Collected · Days to pay 19 avg; Avatar rows with method and date, pills Settled / Plan 2 of 4 / Earned on receipt.
Trust: Card headerLead lock (success well) title "IOLTA ····4821", subtitle "First Republic · 3-way reconciled Sep 1", headerAction success pill "Reconciled", body Amount lg $51,240.00 "Held for 4 clients" + `download` "Audit pack"; warning Banner "14-day notice · appraiser disbursement" text "Estate of Bennett · $1,850.00 · notice sent Sep 24 · disburse from Oct 8" action "Schedule disbursement"; "Balances by matter" list (45-day timer pill warning on Delgado, "Unreconciled 12 days" meta on Okonkwo); "Ledger" Timeline.

**Invoice detail** — NavBar back "Billing", mono `INV-2026-078`, actions upload + more. Pill lg danger dot "Overdue 46 days" (paid → success "Paid today"). Amount display 40/46 $8,125.00 (cents dimmed). Label "Margaret Bennett · Estate of Harold Bennett". Paid → success Banner `check` "Payment received · $8,125.00 by ACH" / "Today 9:52 AM · deposits to operating ····3310 in 1–2 business days. No card fee." actions "Send receipt" · "Back to Billing". KeyValue: Issued "Jul 15 · net 30" · Due "Aug 14" (danger 600 when overdue) · Pay link "Texted Sep 12 · opened Sep 13 · ACH offered first" · Trust "$18,240.00 available · apply" (accent link → Record payment with method Trust). "Line items" (3) action Edit → List regular rows + footer Total. "Activity" Timeline (newest first; payment event uses accent well). Footer: ButtonRow "Record payment" · primary `send` "Text pay link"; tertiary sm block "Offer a payment plan". Paid → single "Send receipt".

**Text pay link** — Dialog "Text pay link for $8,125.00?" / "Margaret Bennett gets a text at (415) 555-0177 with a pay link. ACH is offered first; card adds 2.9%. She last opened a link on Sep 13." actions ghost "Not yet" · primary send "Text pay link". On confirm: Toast "Pay link texted to Margaret Bennett · (415) 555-0177", timeline event, KeyValue updates. Payment arrives by push → paid state.
**Record payment** — Invoice Select; Amount (help "Full balance · leave lower to record a partial"); Method SegmentedControl ACH · Card · Check · Trust (Trust shows outline lock banner "Transfers $8,125.00 from IOLTA ····4821 · $10,115.00 stays in trust"); Received / Reference (optional); primary "Record $8,125.00" or "Apply $8,125.00 from trust".
**Offer a payment plan** — Instalments SegmentedControl 2 · 3 · 4 · 6; Schedule List (date, "On acceptance"/"Auto-charged", amount; last row absorbs rounding; footer Total); OptionRows Auto-charge · Pause late fees; primary send "Text plan · 4 × $2,031.25".

**Contacts** — ScreenHeader, search, chips All 14 · Clients 6 · Opposing · Experts · Courts; sections Clients / Other parties; Avatar rows (org avatars squared with `building`), chevron.
**Contact card** — NavBar back, xl Avatar + title-2 name + role · matter; ButtonRow Call · primary Text · Email; outline Banner `shield` "Conflict pre-check · no matches" / "Checked against 14 contacts and 12 matters on Sep 29. Aliases and related parties included." ghost "Run again"; KeyValue Phone/Email/Type/Portal; "Matters" list.

**Settings** — NavBar back "Today" title "Settings"; profile row (lg accent avatar); Rates (Hourly rate $425.00 per hour, Rounding 0.1h); Device (OptionRow Switches: Courthouse mode — toggles theme; Face ID; Lock after 15 min; Work offline); Notifications (Review your day 5:30 PM, Payments received, Deadlines); Plan row "Clepso for firms · 3 users · renews Oct 12 · $147.00 per month"; destructive block "Cancel subscription" + caption "Cancel in two taps. We export your matters, time and trust ledger before anything closes."

### 5. Behaviour & state
- `timerStore` (zustand): `{ running, paused, seconds, matterId, activity }`; ticks every second; stop → opens Log time with minutes = round(seconds/60), source `timer`.
- Duration → hours: `Math.ceil(minutes/6)/10` (12 min → 0.2h); amount = hours × timekeeper rate (Dana $425.00). Labels always show cents.
- Review your day items: `{ kind: 'call' | 'event' | 'memo', matterId, minutes, suggestedNarrative }`; Bill opens Log time pre-filled; Skip removes.
- Invoice status → pill: draft neutral · sent info · partial warning · overdue danger · paid success. Deadlines: >7d neutral · ≤7d warning · today/missed danger. Court/system → info (teal), never the accent.
- AI suggestions are separate state (`suggestion`, `applied: false`) and only copy into the field on tap; show the outline disclosure banner where required.
- Offline is a state, not an error: compact info banner under the header, writes queued.
- Toasts: 3.2s, inverse surface, optional Undo. Motion: 120ms press, 200ms content, 320ms sheets, `cubic-bezier(.2,.8,.2,1)`.

### 6. Data additions to `apps/mobile/src/mocks/data.ts`
Add: `MockMatter.stages[]` (from playbook), `deadline.rule` (e.g. "Prob. Code §8800"), `rateCents`, `trustCents`; `MockTimeEntry.utbms`, `writtenDown`; `MockInvoice.lines[]`, `payLink { textedAt, openedAt }`, `plan { n, of }`; `MockPayment`; `MockTrustEntry`; `MockContact.matterId`, `conflictCheckedAt`. Use the September 2026 dates and amounts from the prototype's `MATTERS`, `INVOICES`, `CONTACTS` constants (bottom of the DC file).

## Design tokens
See step 1; the complete list with dark values and usage notes is `design/system/tokens.json`.

## Assets
Icons: Phosphor Regular (Fill for the active tab) — names listed in `packages/ui-web/docs/Icon.md`. Fonts: Geist, Geist Mono. Brand mark: placeholder cobalt tile with "C" arc (`BrandMark`).

## Screenshots (`screenshots/`, 390×844 @2x, light + courthouse-mode pair per state)
01 sign-in · 02 today-default · 03 today-nothing-to-review · 04 today-offline · 05 today-timer-paused · 06 capture-sheet · 07 capture-start-timer · 08 capture-voice-memo · 09 capture-log-time (pre-filled from call) · 10 capture-log-time-ai-applied · 11 capture-expense · 12 capture-task · 13 capture-note (dark = "Quick note" courthouse variant) · 14 matters-list · 15 matters-new-matter-playbook · 16 matter-overview-bennett · 17 matter-overview-webb (court-date banner) · 18 matter-activity · 19 matter-time · 20 matter-documents · 21 matter-billing · 22 calendar-agenda (conflict) · 23 calendar-month (deadline chains) · 24 billing-invoices · 25 billing-unbilled-prebill · 26 billing-payments · 27 billing-trust · 28 invoice-overdue · 29 invoice-text-pay-link-dialog · 30 invoice-record-payment · 31 invoice-payment-plan · 32 invoice-payment-received · 33 contacts-list · 34 contact-card-conflict-check · 35 settings.
Each file is `NN-name-light.png` / `NN-name-dark.png`. Screens scroll in the app; captures show the top 844pt.

## Files
- `H1 Mobile Prototype.dc.html` — the prototype and screen board (screens are built in the `Component` class at the bottom; data constants `MATTERS`, `INVOICES`, `CONTACTS` are reusable as fixtures).
- `github.md` — repo/branch association and screen → source map.

