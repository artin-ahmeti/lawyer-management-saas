# Landing redesign — October 8, 2026

Full redesign of `apps/landing`, approved from [the specification](../../../apps/landing/SPEC-redesign.md). The marketing site is dark first with a complete, persistent light option. Dropship informed the centered hierarchy and widening hero-to-product transition; shipped geometry, illustrations, copy and UI are Clepso's own.

## Result and scope

- Centered headline and actions, four incoming legal-work artifacts, polished clepsydra, organized sample matter, and a widening cobalt canopy into a full-width interactive workspace.
- Product → compact cited research → four AI workflows → capability cards → human control/access → FAQ → closing card and footer.
- Landing-only semantic palette and shared visual treatments. Generated design-system files, CRM, mobile, API and database code are unchanged.
- Cookie-backed dark/light first paint using the installed Next.js asynchronous cookies API. The cookie is distinct from staff app preferences; the landing route is intentionally dynamic. There is no hydration suppression, injected theme script or theme-driven remount.
- All product views remain mounted, retaining checked tasks. The four AI workflows retain their original review/edit/reset/source behavior and state across tabs and themes. Preview labels and acquisition configuration remain intact; missing destinations still open honest preview handoffs.
- Native scrolling and dialogs, roving keyboard tabs with responsive orientation, explicit focus styling, 44px source controls, mobile-menu scroll locking and closure on desktop resize.
- Static theme-matched WebPs first; optional Three.js loaded at idle only on capable desktops. Pause freezes grains, light and pointer movement, including a pause requested before load. Offscreen/hidden scenes stop drawing; live reduced motion tears down the enhancement. Import/context failures, data saver and missing WebGL retain the still.

## Verification

Passed on the production build served with `next start`:

- Landing production build and typecheck.
- Scoped ESLint and Prettier checks; `git diff --check`.
- Nine browser regression groups in [`verify-redesign.mjs`](../../../apps/landing/scripts/verify-redesign.mjs): SSR without JavaScript, dark/light responsive layouts at 320/390/768/1024/1440px, cookie persistence and keyboard product tabs, task retention, all four AI review/edit/reset workflows, source focus restoration, FAQ and CTA dialog behavior, mobile menu/navigation/resize, motion lifecycle and fallback modes.
- Automated axe-core WCAG 2.1 A/AA audit: zero violations at desktop/mobile widths in both themes. This is automated evidence, not a claim of complete accessibility conformance.
- Canvas screenshot equality while paused and inequality after resume; WebGL draw counters stop offscreen and on the hidden-tab visibility signal, and resume on return. Software Chromium exercises the lifecycle; real-device GPU frame rates are not established.

The browser regressions found a tablet hero-card overlap, a decorative product glow intercepting the pause control, and an invisible mobile modal retaining scroll lock after desktop resize. Each was reproduced and fixed. Decorative footer lettering was moved to an SVG illustration after the contrast audit; the readable footer wordmark remains. Screenshot review also caught the funnel outline’s implicit black fill and the product glow painting over the matter card; an explicit stroke-only path and corrected stacking order resolve both.

Screenshots and machine-readable results: [`../evidence/landing-redesign/`](../evidence/landing-redesign/). Reference and pre-redesign screenshots are retained separately from the implemented page's desktop/mobile dark/light screenshots. No reference assets are used by the application.

## Local performance samples

Three cold-browser runs per profile on a local production server. Desktop: 1440×1000, DPR 1, unthrottled. Mobile: 390×844, DPR 1, touch emulation, 4× CPU, configured 1.6 Mbps download / 750 Kbps upload and 150ms latency. Median LCP was **276ms desktop / 1,460ms mobile**; CLS was **0** in all six samples. Mobile kept the static hero; capable desktop loaded the optional scene. These local lab samples are not field Core Web Vitals or a real-device frame-rate measurement.

The default desktop page is 8,594px tall at 1440px width, compared with 9,788px before (12.2% shorter). The saved raw samples and [measurement script](../../../apps/landing/scripts/measure-performance.mjs) document the method.

## Decisions and limits

Using a server-readable preference cookie trades static page caching for correct first paint with remembered themes. Section styles and hero choreography are separate from the shared theme foundation. Existing dependencies cover the implementation; Playwright and axe-core remain external verification tools, and no runtime dependencies were added.

Current production site/signup/login/legal/contact values and a finalized favicon remain launch configuration, as already documented in the landing handoff. Preview status is unchanged. The build still warns when `NEXT_PUBLIC_SITE_URL` is unset; the production-stage launch guard remains enabled. No CRM/backend/mobile suites were run for this landing-only change.

Safari, Firefox, actual mobile devices, screen reader sessions and field Core Web Vitals are unverified. Lab performance methodology and individual samples are saved in `performance.json` alongside the screenshots.
