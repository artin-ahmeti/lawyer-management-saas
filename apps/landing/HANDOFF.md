# Clepso landing: handoff

Status on 2026-10-01: a working, responsive marketing page in `apps/landing`, running in the **preview stage** (noindex, sample data, labelled). It is not ready to publish until the launch blockers below are closed.

## 1. Sources used

| Source                                                                                                                                  | Used for                                                  | Status                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Operating map, "How law firms work" tab of the Clepso strategy doc (`claude.ai/code/artifact/c2170f6c-…`, same doc as the brief's link) | Audience, pains, vocabulary, the three research figures   | Read in full; it was written and sourced in this repo's sessions                          |
| Claude Design project `7db5e029…`, `_ds/clepso-…/_ds_bundle.css`                                                                        | Tokens, fonts, dark mapping, radii, shadows               | Read; identical to `design/system/tokens.css` in the repo, which is what the page imports |
| `design/system/README.md`                                                                                                               | Voice, brand-mark rules, colour roles                     | Read                                                                                      |
| osmo.supply                                                                                                                             | Craft reference only (composition, type scale, restraint) | Read via fetch; nothing copied                                                            |
| 21st.dev, React Bits                                                                                                                    | Pattern reference                                         | Not imported; the few patterns used are reimplemented (see section 5)                     |

## 2. Working map: pain → benefit → demonstration → action

"Finding" means a sourced research result from the operating map. "Assumption" means a hypothesis from the brief that the research does not measure.

| Pain                                    | Evidence                                                                                                                                                                                         | Benefit on the page                                                                                  | Demonstration                                                                              | Action             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| Most of the day is not billable work    | Finding: the average lawyer bills 3.0 of 8 hours (Clio Legal Trends 2025)                                                                                                                        | More room for legal work; routine work prepared for review                                           | AI workflows (all four)                                                                    | CTA after the demo |
| Time is rebuilt after the fact          | Finding: 40% call time tracking inefficient (Bloomberg Law 2024); solo work sits 36 days unbilled, median (Clio 2024)                                                                            | Capture time when it happens, review before it is billed                                             | Time-entry suggestions (voice note + activity, editable, billable is a choice)             | CTA after the demo |
| Dates are the biggest risk              | Finding: administrative errors are ~25% of malpractice claims and document preparation/filing is the top claim activity (ABA 2020–2023 via ALPS); insurers expect a named, double-checked docket | Every date has a source and an owner; a requested date is never passed off as a legal deadline       | Email → next actions (explicit "not a calculated deadline" note); Capabilities row 02; FAQ | Product CTA        |
| Clients feel ignored                    | Finding: neglect (1,219) and failure to communicate (630) lead Illinois grievances (ARDC 2024)                                                                                                   | Plain-language updates with the next date, approved by a person                                      | Client-update draft                                                                        | CTA after the demo |
| Work is spread across tools             | Finding: Outlook is the most-named "practice management" tool (ABA 2023); PM adoption is 37% of solos in ABA data vs 79% in Clio data                                                            | One matter holds documents, tasks, messages and time                                                 | Product reveal (Overview / Next actions / Activity)                                        | Product CTA        |
| Which version is current                | Assumption (not measured)                                                                                                                                                                        | One latest version, history kept, changed clauses listed                                             | Hero document fragment; Capabilities document card; Overview card                          | —                  |
| Unclear owner of the next action        | Partly supported (insurer docketing guidance names an owner and a backup)                                                                                                                        | Named owner on every task                                                                            | Next actions view                                                                          | —                  |
| Fear of AI and of moving sensitive work | Finding: AI concerns are accuracy 75%, reliability 56%, privacy 47% (ABA 2024); 57% of solos have no AI policy (Clio 2026); ABA Opinion 512 requires verification and informed consent           | Sources on every answer, "not enough information" instead of guessing, review before anything leaves | Matter brief (citations open the real excerpt), Trust section                              | FAQ                |

**Audience.** Solo lawyers and firms of up to about 20 lawyers, where the lawyer-owner chooses the software (97% of solos and 90% of 2–9 lawyer firms decide technology themselves, ABA 2024). Associates, paralegals and staff are named in the copy and the sample team.

**Vocabulary used.** Matter, requested date versus deadline, owner, time entry, narrative, billable, client update, conflict check, version, walled off.

**Objections the page answers.** AI autonomy, AI accuracy, deadlines. Objections it deliberately does not answer yet are in section 7.

## 3. Token mapping (initial implementation; updated palette below)

The page imports `@lawfirm/ui-web/clepso.tokens.css` (new export: tokens only, generated from `design/src`) and selects dark by default, or light from the saved landing preference (`clepso-landing-theme`). Tailwind's `@theme` in `src/app/globals.css` maps utilities onto those tokens and defines no colours of its own (`--color-*: initial`).

| Tailwind                                                                                              | Token (dark value)                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bg-canvas`                                                                                           | `--bg` #12151B                                                                                       |
| `bg-deep`                                                                                             | `--surface-2` #0E1015 (alternating bands)                                                            |
| `bg-surface` / `bg-raised`                                                                            | `--surface` #191D25 / `--surface-3` #1F242D                                                          |
| `border-hairline` / `border-line` / `border-line-strong`                                              | `--hairline` / `--border` / `--border-strong`                                                        |
| `text-ink` / `text-ink-2` / `text-ink-3`                                                              | `--ink` / `--ink-2` / `--ink-3`                                                                      |
| `text-accent`, focus ring                                                                             | `--accent` #88A3FF (links, selection, 2px focus ring)                                                |
| `bg-accent-tint`, `text-accent-ink`                                                                   | `--accent-tint`, `--accent-ink`                                                                      |
| status (`success-*`, `warning-*`, `danger-ink`, `info-*`)                                             | the matching status tokens                                                                           |
| `rounded-sm/md/lg/xl`, `shadow-sm/md/lg`                                                              | Clepso radius and shadow tokens (they override Tailwind's defaults because the tokens are unlayered) |
| `text-body`, `text-label`, `text-caption`, `text-overline`, `text-mono-id`, `text-title-3`, `text-h3` | the system's type shorthands                                                                         |

**Marketing extensions** (the only values the site adds, all in `:root` in `globals.css`):

- `--mk-cobalt` #2B52D9, `--mk-cobalt-hover`, `--mk-cobalt-pressed`, `--mk-on-cobalt` #FFFFFF. These are the system's light-theme accent values, used for filled actions on the dark page (white on cobalt is 6.3:1). Small text and focus use the dark `--accent` instead.
- Layout scale: `--mk-content` 1344px, `--mk-gutter`, `--mk-section`, `--radius-panel`.
- Display type (`text-display` 44–96px, `text-h2` 36–64px) and `text-lede`. The product system has no display style by design.

The brief's provisional hex values were not needed: the system's dark set covers them.

## 4. Identity

The design system has no final logo, and its README says the cobalt "C" tile is a placeholder that must not appear on marketing. The header therefore uses the approved **Geist wordmark** (600, −0.03em) alone, and the clepsydra vessel stays a separate motif. No favicon is set. **Blocker:** a final mark (and favicon) before launch.

## 5. Assets, libraries and licences

| Item                         | Source                                                                                                                                                      | Licence       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Geist, Geist Mono            | Google Fonts via `next/font` (self-hosted at build)                                                                                                         | SIL OFL 1.1   |
| Icons                        | Clepso icon set, `@lawfirm/ui-web/icons` (new subpath export); `menu`, `replay`, `arrow-right`, `paperclip`, `history` drawn for this site on the same grid | Project-owned |
| Vessel (3D and images)       | Original geometry in `src/components/hero/vessel-profile.ts`; rendered by `vessel-scene.ts`; stills in `public/vessel/` produced by `pnpm render:vessel`    | Project-owned |
| three 0.186                  | npm                                                                                                                                                         | MIT           |
| motion 13 (Motion for React) | npm                                                                                                                                                         | MIT           |
| tailwindcss 4.3              | npm                                                                                                                                                         | MIT           |
| zod 4 (server route only)    | npm                                                                                                                                                         | MIT           |

No component was imported from 21st.dev or React Bits. Reimplemented patterns: short CSS reveals for headings (real text, no per-letter splitting), WAI-ARIA tabs with roving focus, a native `<dialog>` for modals and the mobile menu, and CSS scroll-driven reveals as progressive enhancement.

## 6. Feature status (central config: `src/config/features.ts`)

| Feature                                                                                     | Status shown | Assumption                                                                                    |
| ------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| Matters and clients, tasks and deadlines, documents, client communication, time and billing | Preview      | Built in the staff web and mobile apps, running on sample data; not generally available       |
| Email to next actions, matter brief, time-entry suggestions, client-update draft            | Preview      | Designed and demoed with sample data; no AI service exists yet                                |
| Voice assistant / voice capture                                                             | Planned      | Not built                                                                                     |
| Matter-level permissions, activity history                                                  | Preview      | Schema supports matter access grants and an append-only audit log; no user-facing UI verified |

Nothing is marked Available. Change a status in one place and every badge, the FAQ and the hero note follow.

## 7. Launch blockers and open questions

A build with `NEXT_PUBLIC_SITE_STAGE=production` fails until these are set (`src/config/launch.ts`):

1. `NEXT_PUBLIC_SITE_URL`: the approved domain (not guessed). Without it the generated social image (`src/app/opengraph-image.tsx`) resolves to a localhost URL. `robots.txt` disallows everything until the production stage sets `NEXT_PUBLIC_SITE_INDEXABLE=true`.
2. `NEXT_PUBLIC_LOGIN_URL` and, in signup mode, `NEXT_PUBLIC_SIGN_UP_URL`: the production web app. Locally they point at `localhost:3100` through `.env.local`.
3. In early-access mode, `EARLY_ACCESS_ENDPOINT` (for example a NestJS route). The form reports success only when that endpoint returns 2xx. Nothing is written to Supabase from this app.
4. `NEXT_PUBLIC_PRIVACY_URL` and `NEXT_PUBLIC_TERMS_URL`: real pages.

Not enforced by the build, but required before launch:

5. Final logo and favicon.
6. Reconcile every status in `features.ts` with what has actually shipped.
7. Company legal name for the footer copyright.

Questions deliberately left off the public page until they have confirmed answers: importing existing matters and migration help; encryption, hosting region, retention and backups; whether customer data trains AI models; certifications; pricing; integrations (QuickBooks, Outlook, e-filing); support and onboarding; data export.

## 8. Analytics hooks (`src/lib/analytics.ts`)

Events: `cta_click` (location, mode, destination), `login_click`, `product_view_select`, `ai_workflow_select`, `ai_review_complete` (workflow, outcome), `source_open`, `hero_replay`, `motion_toggle`, `faq_open`, `early_access_submit` (result only). No form values or sample content are sent. Delivery is a `clepso:analytics` DOM event plus `window.dataLayer` if a tag manager exists; nothing is sent by default. A CTA click is not a signup; measure completed signups in the web app.

## 9. Original verification (2026-10-01; historical baseline)

Local machine, Chromium via Playwright, production build (`next build` + `next start`).

- **Widths:** 320, 390, 768, 1440 and 1920. No horizontal overflow at any width. The 320px reflow keeps every control usable.
- **Interaction script (26 checks, all passing):**
  - skip link and focus on `main`;
  - CTA and login destinations;
  - product tabs by keyboard (arrows, End);
  - each AI workflow end to end: review, edit, confirm, reset, "not enough information", source excerpts with focus moving in and back out on Escape, simulated voice;
  - the contextual CTA, the FAQ, the mobile menu (modal, Escape returns focus, links close it);
  - the analytics events.
- **Early-access mode:**
  - every CTA switches to "Request early access";
  - field errors show on invalid input;
  - "nothing was sent" appears when no endpoint is configured;
  - success appears only after a mock endpoint accepted the enquiry (honeypot not forwarded, bearer token sent);
  - login without a URL opens the labelled preview handoff.
- **API:** 422 on invalid input, 503 `not-configured` without an endpoint. Security headers are present and `noindex` is set in preview.
- **Guard:** a production-stage build fails and lists the open blockers.
- **Without JavaScript:** all headings, demos and the hero excerpt render, and the hero rows finish visible.
- **Reduced motion:** the final hero composition shows at once, with no fragments, no replay and no 3D.
- **Lab performance** (localhost, so network timing is optimistic):

  | Profile                              | LCP    | CLS | Click to next paint |
  | ------------------------------------ | ------ | --- | ------------------- |
  | Desktop, unthrottled                 | ~40 ms | 0   | 7–14 ms             |
  | Mobile, 4× CPU and 1.6 Mbps / 150 ms | ~1.0 s | 0   | 19 ms               |

  The LCP element is the vessel image. Phones load about 195 KB of gzipped JS and never download three.js; capable desktops add a 133 KB three.js chunk after idle.

**Not verified:** Safari and Firefox, real iOS and Android devices, a screen reader pass (VoiceOver, NVDA), real-GPU rendering of the 3D scene on low-end laptops, and field Core Web Vitals (there is no field data before launch).

## 10. Regenerating the vessel images

Change the profile in `vessel-profile.ts` or the materials in `vessel-scene.ts`, start the dev server, then run `PLAYWRIGHT=<path to playwright> pnpm --filter @lawfirm/landing render:vessel`. The dev-only route `/dev/vessel` returns 404 in production builds.

## 11. October 8, 2026 redesign

The current implementation is described in [SPEC-redesign.md](SPEC-redesign.md), [README.md](README.md), and [the slice record](../../docs/implementation/slices/landing-redesign.md). Earlier token values and performance figures above document the original implementation; they are not the current palette or benchmark.

The page now uses the order hero → product → compact research → AI workflows → capabilities → control → FAQ → closing. Dropship informed the centered hierarchy and widening funnel transition. Its screenshots are research evidence only; no reference assets or scripts are shipped.

The new landing-only palette is in `src/app/theme.css`. Dark canvas/surface/raised are `#0B0E14` / `#131821` / `#1A202C`, with text `#F3F5FC` / `#ADB7CA` / `#929DB2`. Light uses `#FAFBFF` / `#FFFFFF` / `#F6F8FF`, with text `#172137` / `#536078` / `#616E84`. Semantic utilities still resolve through Clepso token names; generated/shared design files are untouched. Marketing width is 1280px, section spacing 64–96px, hero type 42–92px, and section headings 32–54px.

A server-rendered cookie preference avoids wrong-theme first paint and hydration workarounds. The route is intentionally rendered on demand rather than statically cached. The cookie stores a non-sensitive preference, is separate from staff app preferences, and uses SameSite=Lax with Secure on HTTPS. Unknown values fall back to dark.

The vessel keeps its original project-owned geometry, with polished cobalt/silver materials, lower mesh resolution and deterministic grain phases. Six matching WebPs cover dark/light at three sizes. Native scrolling, finite CSS entrances, paused motion, live reduced-motion changes, lazy loading and static fallbacks keep the enhancement optional.

The final wordmark/favicon and production site/signup/login/legal/contact destinations remain the existing launch configuration work. Browser screenshots and lab performance do not establish real-device GPU performance or field Core Web Vitals. Safari, Firefox, assistive-technology sessions and real mobile devices remain unverified.
