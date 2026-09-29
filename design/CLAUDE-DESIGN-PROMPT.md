# Clepso — brief for Claude Design

You are the lead product designer for **Clepso**, a mobile-first practice-management platform for small law firms (competing with Clio, MyCase and Litify). You have two sources of truth connected: the **Clepso design system project** and the **GitHub repository**. Design only with them.

## 1. Sources of truth, in order of authority

1. **The Clepso design system project (Claude Design).** Read its README first: it starts with "Building with Clepso", the conventions you must follow. Then use the components as shipped: 81 of them, each with a props contract (`.d.ts`) and a usage doc with a working example (`.prompt.md`). The `guidelines/README.md` file is the brand book.
2. **Repository files** (read before designing, do not restyle them):
   - `design/system/README.md` — brand book: principles, voice, colour, type, spacing, status vocabulary.
   - `.design-sync/conventions.md` — how screens are assembled (root wrapper, class vocabulary, tokens, IA rules).
   - `design/src/screens/*.html` — twelve reference screens (nine mobile, three web) already composed in this system. Match their density and hierarchy.
   - `packages/ui-web/docs/*.md` — one usage doc per component.
   - `apps/mobile/src/mocks/data.ts` — the domain model and sample data (matters, tasks, time entries, invoices, contacts, events). Use these shapes and this data.
   - `apps/mobile/app/**` — the current mobile routes. They are being replaced; use them only to understand which screens exist today.
   - `FEATURE-STRATEGY` summary below — what we are building and why.

If the design system and the repository disagree on visuals, the design system wins. If the repository has data or copy the design system lacks, use the repository.

## 2. Product context

Clepso's thesis: the phone is the whole practice. Incumbents ship cut-down companion apps; we make the four things that decide a small firm's revenue work completely from the phone, then give clients a native app they use:

1. **Capture, don't enter** — voice memo → time entry, post-call "bill 0.2h to Alvarez?", calendar event → entry, a daily "Review your day" card.
2. **Bill and collect from the phone** — draft → approve → send with text-to-pay, ACH first, payment plans, "who to nudge".
3. **Never re-login, works offline** — biometric session, offline-first with sync, "courthouse mode" (dark, silent, quick notes, timers).
4. **Answer every lead in 60 seconds** — missed-call text-back, AI first reply, conflict pre-check (horizon 2).
5. **A client app clients actually use** — plain-language stage tracker, push, upload, e-sign, pay (horizon 3).
   Plus rules-based deadlines, compliance-grade trust accounting, practice playbooks (flat-fee first), and opt-in, disclosed, grey AI.

Success in reviews reads: **"the app works in court"** and **"I got paid faster."** Every screen should make one of those two sentences truer.

## 3. Non-negotiables

- Wrap every screen in `ClepsoRoot` (mobile density by default, `density="web"` for web pages). Compose from the shipped components before anything else; use the `cl-*` classes and `var(--token)` values only for layout glue. Never introduce a colour, typeface, radius, shadow or icon that is not in the system. Geist and Geist Mono only.
- **Lists first, cards for the exception.** Rows live in `List`/`ListRow`. A `Card` is only for the running timer, Review your day, Who to nudge, a deadline, a trust warning.
- **One primary button per view**; labels are verbs with the outcome, money with cents ("Send for $8,125.00").
- **Colour is state.** Pill tones: accent = open/in progress, success = paid/done, warning = due within 7 days, danger = overdue or at risk, info (teal) = court/system. Never use the accent for status or a status colour as decoration.
- **Numbers are type.** `Amount` for money and hours, `Mono` for matter numbers (2026-0187), invoice numbers (INV-2026-078), UTBMS codes (L110), account suffixes (····4821). At most two KPI tiles per phone screen, four per web page.
- **Mobile IA:** `TabBar` Today · Matters · [Capture] · Calendar · Billing. `TimerBar` docks above it whenever a timer runs. Every create/edit flow is a `Sheet` with one `size="lg" block` primary button. Detail screens use `NavBar` with a mono identifier; root tabs use `ScreenHeader`.
- **Web IA:** `AppShell` with `Sidebar` (Today, Inbox, then Work: Matters, Contacts, Calendar, Tasks, Documents; Money: Time & expenses, Billing, Trust, Reports), `TopBar` with ⌘K search and the running timer, `PageHeader` → `Toolbar` → `Table` with a `Drawer` for the selected row.
- **AI is grey and opt-in.** `AiSuggestion` under the field, never auto-applied; `Banner tone="outline"` for disclosures. No purple, no sparkles.
- **Clients get plain language.** `StageTracker variant="client"` names the next dated event. Never show stage codes, timekeepers or UTBMS codes to clients.
- Light is the default; design the **dark (courthouse mode) twin** for every mobile screen in horizon 1. Both themes are already in the tokens; do not invent dark colours.
- Realistic content only, from the sample firm below. No lorem ipsum, no "John Doe".

## 4. Sample firm (use consistently)

Firm **Tran & Okafor LLP**. Attorneys **Dana Okafor** (DO, signed-in user, $425/h), **Lisa Tran** (LT, $325/h), **J. Whitfield** (JW, $300/h). Matters: **Estate of Harold Bennett** 2026-0187 (Probate, client Margaret Bennett, hourly, stage Inventory, filing due Fri Oct 3, unbilled $4,825.00, trust $18,240.00 in IOLTA ····4821); **Alvarez v. Meridian Logistics** 2026-0142 (Personal injury, Sofia Alvarez, contingency, Discovery, cutoff Oct 24); **Kessler Holdings — Series B** 2026-0201 (Corporate, flat fee, milestone 2 of 3, unbilled $12,500.00); **People v. Marcus Webb** 2026-0119 (Criminal defense, flat fee earned on receipt, pretrial hearing today 9:30 Dept. 22); **In re Marriage of Delgado** 2026-0210 (Family, flat fee, payment plan 2 of 4); **Okonkwo I-130 petition** 2026-0214 (Immigration, RFE window Oct 11). Invoices: INV-2026-078 Margaret Bennett $8,125.00 overdue 46 days (pay link opened Sep 13); INV-2026-092 Kessler $25,000.00 sent, due Oct 9; INV-2026-095 Marcus Webb $3,000.00 draft; INV-2026-094 Delgado $1,625.00 partial; INV-2026-061 Thanh Nguyen $4,450.00 paid Jul 18. Today is **Monday, September 29, 2026**. Time entries look like "Draft inventory schedules · 1:36 (1.6h) × $325.00 = $520.00 · L110".

## 5. Deliverables, in priority order

Work horizon by horizon. Finish a horizon completely (all screens, all states, dark twins, one clickable flow) before starting the next.

### Horizon 1 — "Bill from the courthouse" (mobile, staff app)

1. **Sign in** (Face ID primary, password fallback) and **first-run** (create or import firm, choose practice playbooks).
2. **Today** — greeting, Billed today + Unbilled tiles, Review your day, agenda, Who to nudge, docked timer. States: nothing to review, offline banner, timer paused.
3. **Capture sheet** and its six flows: **Start timer** (hero timer, matter chips), **Voice memo** (recording, transcription, "Bennett, point three…" parsed into an entry), **Log time** (pre-filled from a stopped timer, AI narrative cleanup, billable toggle), **Expense** (receipt photo, amount, matter), **Task**, **Note**.
4. **Matters** list (Needs attention / Active, chips, search, long-press capture) and **Matter detail** with its tabs: Overview (stage tracker, deadline banner, mini KPIs, tasks, recent time), Activity, Tasks, Time, Documents (folders, preview, share link), Billing (unbilled, invoices, trust for this matter). Include **New matter from a playbook** (probate, PI, family, criminal, immigration).
5. **Calendar** — agenda and month, court events, deadline chains, "add to calendar", conflict with a hearing.
6. **Billing** — Unbilled (pre-bill review by matter with write-down), Invoices, Payments, Trust. **Invoice detail** with text-to-pay, **Send invoice** confirmation, **Record payment** sheet, **Offer a payment plan** sheet, **Payment received** state.
7. **Trust** — per-matter balance card, ledger, 3-way reconciliation status, 14-day notice / 45-day disbursement timers, audit pack export.
8. **Contacts** — list, contact card with conflict pre-check, call/text actions.
9. **Settings** — profile, rates, courthouse mode, biometric session, notifications, cancel in-app (honest business model).
10. **Courthouse mode**: the dark twin of every screen above, plus the "quick note during hearing" variant.
    Deliver one clickable prototype: _Today → Review your day → Bill 0.2h → Billing → Invoice → Text pay link → Payment received._

### Horizon 1 — web (staff)

1. **Today** dashboard (Me / Firm scope).
2. **Matters** table with drawer; **Matter detail** page with tabs.
3. **Pre-bill review** (grouped table, write-downs inline, generate invoices, LEDES export).
4. **Invoice detail** and **Payments**.
5. **Trust ledger** and reconciliation.
6. **Calendar** (week view with court events and deadlines).
7. **Settings** (firm, users and roles, playbooks, billing, integrations: QuickBooks/Xero, Google/M365 calendar, Stripe).
   One clickable flow: _Matters → drawer → Pre-bill review → Generate invoices → Invoice sent._

### Horizon 2 — "Never miss a lead or a deadline" (mobile + web)

Inbox (leads, client messages, approvals) taking the Calendar tab; missed-call text-back and AI first reply (disclosed); consult booking; conflict pre-check from the contact card; rules-based deadline chains and the docketing audit trail; reporting (utilization, realization, collection, AR aging) with benchmarks; migration from Clio/MyCase with a reconciliation report.

### Horizon 3 — "Clients love you" (client app)

Case (plain-language stage tracker with the next dated event), Messages, Upload (camera), Payments (fee-free bank transfer first), e-sign, review ask at matter close. Tabs: Case · Messages · Upload · Payments. Softer voice, same tokens.

## 6. How to work efficiently

- Build the frames first (`PhoneFrame` with the shared `TabBar` + `TimerBar`; `AppShell` with `Sidebar` + `TopBar`), then compose screens inside them. Reuse; never redraw a component.
- Start each screen from the closest reference in `design/src/screens/` and from the component's own usage example.
- For every screen produce: default, empty, loading (`Skeleton`), error, and offline where relevant. Show one dark twin per mobile screen.
- Write real copy from the user's side of the screen (Bill 0.2h, Text pay link, Mark filed). Client copy states the next dated event.
- When a component is genuinely missing, compose it from primitives (List, Card, Pill, Amount, Icon) and record it in a **Component gaps** list with the props you would want. Do not invent a new visual style for it.
- Keep a **Decisions log** for anything you chose that the sources leave open (e.g. how a payment plan is shown, week-view density).

## 7. Quality bar (check before you hand back)

Every screen: wrapped in `ClepsoRoot`; one primary action; status carried by pills with the right tone; amounts in `Amount`, identifiers in `Mono`; lists in `List`, cards only for the exceptions; gutters 20px on mobile, 24/32 on web; tap targets ≥ 44pt; the timer bar docked whenever a timer runs; dark twin legible; no colour, type or icon outside the system; no lorem ipsum.

## 8. Hand back

1. Screens grouped by horizon and platform, named `H1 · Mobile · Billing · Invoice detail · default | dark | empty`.
2. The two clickable flows above.
3. **Component gaps** (name, purpose, proposed props, which screen needed it).
4. **Decisions log**.
5. A **copy deck** for the client app (every string a client sees).
