# @lawfirm/landing

The Clepso marketing site: one responsive page built with Next.js 16 (Turbopack), TypeScript and Tailwind CSS v4, using Clepso design tokens and a landing-only marketing palette. All product demonstrations use one fictional matter and run in the browser; no AI service is called.

```sh
pnpm install
pnpm --filter @lawfirm/ui-web build        # tokens + icons the site imports
cp apps/landing/.env.example apps/landing/.env.local
pnpm --filter @lawfirm/landing dev         # http://localhost:3200
```

Set `NEXT_PUBLIC_SIGN_UP_URL` and `NEXT_PUBLIC_LOGIN_URL` to the web app (`http://localhost:3100/sign-up` and `/sign-in` locally), or `NEXT_PUBLIC_LAUNCH_MODE=early-access` for the enquiry form.

## Where things live

- `src/config/site.ts`: destinations, launch mode, stage. `src/config/features.ts`: Available / Preview / Planned. `src/config/launch.ts`: blockers that fail a production-stage build.
- `src/content/sample-matter.ts`: the fictional matter every demo reads.
- `src/components/sections`: page sections in reading order. `src/components/demo`: the four AI workflows. `src/components/hero`: vessel scene, static fallback and the hero sequence.
- `src/app/api/early-access`: validates enquiries and forwards them to `EARLY_ACCESS_ENDPOINT`.

See `HANDOFF.md` for the research map, token mapping, licences, feature-status assumptions, launch blockers and test record.

## Redesign and browser verification

The approved design and reference analysis are in [SPEC-redesign.md](SPEC-redesign.md). Dark is the default even when the operating system prefers light. The accessible header control remembers the choice in `clepso-landing-theme`; the server reads that cookie before the first paint. This makes the landing route dynamic. Theme changes preserve product-task and AI-demo state.

Styles are separated into token/utility foundations (`globals.css`), theme and shared visual styles (`theme.css`), section composition (`redesign.css`), and hero geometry/choreography (`hero.css`). The original clepsydra is a pre-sized WebP first, with an idle-loaded Three.js enhancement on capable desktops. Pause freezes the full scene, including pointer response. Offscreen/hidden scenes stop drawing; reduced motion, data saver and unsupported WebGL keep the still.

Run the focused browser checks against either dev or `next start`:

```sh
PLAYWRIGHT=/path/to/playwright/index.mjs \
CHROMIUM_PATH=/path/to/chromium \
AXE_PATH=/path/to/axe-core/axe.min.js \
pnpm --filter @lawfirm/landing verify:browser
```

Playwright and axe-core are verification tools, not application dependencies. Omit `CHROMIUM_PATH` to use Playwright's installed Chromium. `AXE_PATH` enables the automated WCAG audit. Set `EVIDENCE_DIR` to save screenshots and results. The suite covers five viewport widths, both themes, SSR without JavaScript, persisted state, every AI workflow, native dialogs, mobile navigation, motion lifecycle and static fallbacks.

The render command regenerates both themes' 480/720/1200px stills. It uses the same optional `PLAYWRIGHT` and `CHROMIUM_PATH` settings and requires the development server, since `/dev/vessel` is disabled in production.

See [the redesign slice record](../../docs/implementation/slices/landing-redesign.md) for the current validation and remaining launch configuration.
