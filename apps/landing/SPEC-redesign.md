# Clepso landing-page redesign

Status: implemented and verified on October 8, 2026, on `impl/core`. Current evidence and validation are recorded in [the slice record](../../docs/implementation/slices/landing-redesign.md).

## Objective

Redesign the entire marketing site in `apps/landing` as a modern, clean, dark-first presentation of Clepso, with a complete light-theme option. Make the clepsydra the central visual idea: scattered work flows through a narrow point of focus and becomes organized, reviewable matter activity. Carry that idea from the hero into the product reveal and through a coherent page, rather than treating the hero as an isolated animation.

Audience: solo lawyers, small firms, and the people running their practices. The primary action remains the acquisition action selected in `src/config/site.ts`. Existing signup, login, early-access, product-demo, and AI-review behavior must remain functional.

Scope is the marketing site and its own assets. CRM, mobile, backend, shared component APIs, and deployment are outside this redesign.

## Reference analysis

Reference: [Dropship](https://www.dropship.io), inspected on October 8, 2026. Its public markup and assets were fetched over verified HTTPS and rendered as a local browser snapshot. Desktop and mobile views were examined; 104 requested reference resources loaded without fetch failures. Reference screenshots are research evidence, not assets for the shipped Clepso website.

- [Desktop hero](../../docs/implementation/evidence/landing-redesign/dropship-hero.png)
- [Product reveal](../../docs/implementation/evidence/landing-redesign/dropship-product.png)
- [Mobile hero](../../docs/implementation/evidence/landing-redesign/dropship-mobile.png)

### What makes the reference work

| Observed pattern                                              | Why it works                                                      | Clepso interpretation                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| White page, dark typography, selective blue emphasis          | Makes the hierarchy legible and gives the brand color a clear job | Translate the hierarchy into Clepso's dark tokens by default, with a complete light option and restrained cobalt emphasis |
| Centered headline, short supporting copy, adjacent actions    | Establishes one reading order before the decorative sequence      | Center the hero and make the main CTA immediately visible                                                                 |
| Three lanes of product cards around a central mark            | Shows incoming information becoming useful product insight        | Use small matter artifacts: email, document, requested date, and time                                                     |
| A narrow blue center that expands into the next section       | Makes the hero and product presentation feel like one composition | Shape the transition around Clepso's clepsydra and introduce the workspace under its widening base                        |
| A large product screen with selectable tool icons             | Makes the offering tangible soon after the promise                | Give the existing matter overview, next actions, and activity views a prominent, readable frame                           |
| Soft shadows and pale blue feature surfaces                   | Creates depth while keeping the background quiet                  | Use a small elevation hierarchy and subtle tinted surfaces                                                                |
| The motif returns near the closing sections and footer        | Creates visual continuity across the page                         | Echo the vessel silhouette in the closing section and restrained footer composition                                       |
| Stacked mobile actions and a cropped version of the same hero | Preserves the idea without forcing a desktop layout onto a phone  | Keep the silhouette on mobile, simplify the card choreography, and make actions comfortably tappable                      |

The redesigned site will use original Clepso geometry, content, cards, and assets. Dropship's branding, copy, product imagery, and scripts will not be included in the application. Its dense repeated card rows and many tool icons will be translated into a smaller set of meaningful legal-work examples.

### Current Clepso baseline

The existing page renders without browser page errors at 1440 and 390 pixels wide. At 390 pixels, the document width is also 390 pixels. Its desktop document is 9,788 pixels tall in the default state. The UI package build and landing type check passed before redesign.

- [Current desktop page](../../docs/implementation/evidence/landing-redesign/clepso-before.png)
- [Current mobile page](../../docs/implementation/evidence/landing-redesign/clepso-mobile-before.png)

The existing design has a useful fictional matter and working interactive demos. Its repeated section eyebrows, long explanations, dark surfaces, scattered hero fragments, and repeated card treatments weaken the hierarchy. The redesign will improve the presentation while preserving those useful interactions.

## Design contract

### Visual direction

Dark is the default for first-time visitors. Use the existing Clepso midnight/graphite backgrounds, slightly lifted surfaces, readable off-white text, fine neutral divisions, and selective cobalt light. Keep the page crisp: restrained depth, quiet reflections, and no large decorative glow behind every section. Preserve the reference's clarity and continuous silhouette within this darker palette.

Provide a complete light option using the existing Clepso light tokens, white surfaces, and graphite text. All sections, product demos, dialogs, buttons, status badges, and decorative assets must be legible and intentional in both themes. Theme changes are scoped to `apps/landing`; do not change the CRM or shared theme definitions.

Place an accessible theme toggle in the desktop header and the mobile navigation. Remember an explicit choice in a landing-specific preference, separate from the staff app's theme setting. Render the selected theme without a flash or hydration mismatch; the unselected default remains dark even if the operating system prefers light. Keep a visitor's choice across navigation and reloads. The toggle's accessible name describes its action, such as “Switch to light theme.” Update the browser theme color to match. Theme changes should use a brief color transition, respect reduced motion, and leave 3D geometry and demo state intact.

Keep Geist and Geist Mono. Use one strong headline, a restrained section-heading scale, and readable supporting text. Avoid ornamental letter-by-letter animations. Target a desktop hero heading around 64–76 pixels and a mobile heading around 40–48 pixels, using fluid sizing and balanced line breaks.

Use the existing maximum content width and spacing scale. Different sections may be narrow, full-width, or split according to the content. Borders should be fine and shadows soft. Reserve larger radii for product frames and smaller radii for controls and individual artifacts. Keep filled cobalt for the main action, a clear focus indicator, and selected states.

### Hero composition

1. A compact navigation bar with the wordmark, section links, login, and the main CTA. On scroll it gains a subtle surface and divider. Mobile uses the existing accessible modal menu.
2. A small preview eyebrow, followed by a centered headline. Initial copy direction: **Every matter. Moving forward.** Use blue emphasis sparingly; the headline remains real, selectable text.
3. One short paragraph explaining the workspace and human-reviewed assistance. Show the configured acquisition CTA and a secondary link into the product presentation.
4. A full-width visual stage below the actions. A large sculptural clepsydra sits at its center, with a translucent body, a pinched neck, restrained cobalt reflections, and a fine sand-like flow.
5. A few quiet incoming artifacts move toward the neck. On the other side, a resolved matter card shows an owner, a next action, and its source. The visual must also make sense as a still image. In dark mode, use restrained edge light and off-white card text; light mode uses soft reflections and graphite text.
6. The narrowing/widening silhouette continues into a softly illuminated cobalt product canopy in dark mode and a pale cobalt canopy in light mode. The next section and its workspace frame should feel connected to the hero rather than separated by an arbitrary empty block.

Use the existing vessel geometry and renderer as a starting point, refining them for the new composition. Generate matching static renders for mobile, reduced motion, data saver, and unavailable WebGL, with appropriate lighting and backgrounds for each theme. Keep the vessel silhouette recognizable in both themes. The hero remains useful before JavaScript loads and when enhancement fails.

### Page sequence

| Section                   | Presentation                                                                                              | Required behavior                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hero                      | Centered copy and the clepsydra flow stage                                                                | Configured CTA, product anchor, motion controls                                                  |
| Product reveal            | Large workspace frame under the widening hero silhouette                                                  | Preserve Overview, Next actions, and Activity tabs with keyboard navigation                      |
| The problem Clepso solves | A shorter comparison of scattered work and one connected matter                                           | Preserve the meaning of the examples and attribution for any retained research figures           |
| AI workflows              | One clear demo stage with four selectable workflows and stable framing                                    | Preserve source inspection, editing, review, approval, reset, and unavailable-information states |
| Practice capabilities     | A small set of purposeful compositions for matters, dates, documents, communication, and billing          | Keep availability labels derived from `features.ts`; examples remain identifiable as sample data |
| Human control             | Quiet permissions and review-history panels, with shorter supporting copy                                 | Preserve the distinctions between prepared, approved, and sent work                              |
| FAQ                       | A calm, readable disclosure list with smooth expansion                                                    | Keyboard operation, analytics events, and truthful existing answers                              |
| Closing and footer        | A return to the vessel silhouette, one clear action, and useful navigation, styled for the selected theme | Preserve configured login/contact/legal destinations and the preview state                       |

The desktop default narrative should be substantially shorter than the 9,788-pixel baseline. Prefer removing repeated explanations and redundant visual padding to compressing the demos or making their text smaller.

Do not add testimonials, customer counts, pricing, certifications, or product availability that the existing material cannot substantiate.

## Motion contract

Smoothness comes from a small, consistent vocabulary and stable layouts. Keep native scrolling; do not introduce scroll hijacking or a smooth-scroll dependency.

| Interaction               | Proposed treatment                                              | Timing or limit                                           |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Hero text and actions     | Short opacity/vertical entrance, with a small stagger           | 500–700 ms; displacement at most 16 px                    |
| Clepsydra entrance        | Gentle opacity and position settle                              | About 900 ms; no spring overshoot                         |
| Initial artifact flow     | A coordinated finite sequence into the neck and resolved output | Approximately 3–4 seconds                                 |
| Ambient sand and lighting | Slow, low-amplitude motion                                      | Pausable; stop when offscreen or the tab is hidden        |
| Pointer response          | Small, interpolated orientation change on capable desktops      | At most a few degrees; no pointer effect on touch devices |
| Section entrances         | Short reveal at viewport entry                                  | 450–650 ms; displacement at most 20 px                    |
| Product/AI tab changes    | Crossfade with a small directional settle                       | 240–320 ms; outgoing state cannot trap focus              |
| Buttons and selection     | Color, border, shadow, or a short indicator movement            | 160–220 ms                                                |
| Theme switch              | A short, coordinated surface and text-color transition          | About 180–240 ms; immediate with reduced motion           |
| FAQ and dialogs           | Restrained opacity/expansion transition                         | Approximately 220–300 ms                                  |

Use a shared easing vocabulary based on the existing `--ease-standard`; a decelerating entrance curve may be added as a landing-scoped token. Avoid animated layout properties in continuous motion. Animate transforms and opacity, cap renderer pixel ratio, and avoid React state updates per animation frame.

The motion control must pause every ongoing hero animation, including CSS motion in the fallback, and stay available whenever continuous animation is active. A pause during lazy initialization must still apply when the renderer starts. Respect changes to reduced-motion preference while the page is open. Reduced motion displays the final composition immediately and does not load the animated 3D enhancement. Decorative animation must never hide necessary content or delay access to a CTA.

## Responsive and accessibility rules

- Check 320, 390, 768, 1024, and 1440 pixel widths, plus a short desktop viewport.
- No horizontal document overflow. Product frames may scroll internally where the existing presentation requires it, with an evident affordance.
- Keep one `h1`, a logical heading hierarchy, the skip link, descriptive control names, visible focus, and minimum 44-pixel touch targets.
- The existing native dialogs keep focus containment, Escape dismissal, and focus restoration. The mobile menu locks its own modal interaction without breaking ordinary page scrolling afterward.
- Tabs retain roving focus, arrow keys, Home/End behavior, and correct tab/panel relationships.
- Normal text must meet 4.5:1 contrast; large text and meaningful UI boundaries must meet their applicable 3:1 requirements. Warning text, status badges, focus indicators, muted text, glass edges, and disabled controls require review in both themes.
- On mobile, reduce the number of decorative cards and use the static vessel as the default. Do not shrink dense desktop scenes into illegible miniatures.
- With JavaScript disabled, core content, the visual fallback, product explanation, and normal anchor navigation remain available. Interactive demos may stay in their default static state.

## Technical structure and code style

Keep the existing stack: Next.js 16.3, React 19, TypeScript 6, Tailwind CSS 4, Motion 13, and Three.js 0.186. No new dependency is currently required.

Relevant files:

- `src/app/page.tsx`: section order and page composition.
- `src/app/layout.tsx` and `globals.css`: landing theme, fonts, typography, spacing, and shared motion tokens.
- `src/components/hero`: vessel, artifacts, fallback, and motion controls.
- `src/components/sections`: redesigned section layouts.
- `src/components/demo`: existing reviewable workflows.
- `src/components/site`: navigation, landing-specific theme preference and toggle, acquisition actions, dialogs, and footer.
- `src/config` and `src/content`: existing configuration and fictional matter; preserve their role as the source of truth.
- `public/vessel` and `scripts/render-vessel.mjs`: matching renders generated from the revised geometry.

Use named components and existing helpers. Keep static content in server components and interactive behavior behind focused client boundaries. Read Next.js's installed documentation before framework changes. Keep each component responsible for a clear part of the presentation.

An existing pattern to retain:

```tsx
<CtaButton location="hero" size="lg" arrow />
<StatusBadge status={statusOf('documents')} />
```

Do not hard-code a new acquisition destination, duplicate feature-state logic, or make the page pretend a disconnected signup or early-access service succeeded.

## Verification commands

Run from `/workspace/lawyer-management-saas`, using the repository-pinned Node and pnpm versions:

```sh
pnpm --filter @lawfirm/ui-web build
pnpm --filter @lawfirm/landing dev
pnpm --filter @lawfirm/landing typecheck
pnpm --filter @lawfirm/landing build
pnpm exec eslint apps/landing/src
pnpm exec prettier --check apps/landing
```

The development and production servers use port 3200. Browser checks use internal requests; no deployment is implied. The production build check uses the repository's preview stage unless actual launch configuration has separately been supplied. The existing production-stage launch guard remains intact.

There is no landing unit-test script in the current package. Do not report an empty test run as validation. Use browser interaction checks for the redesign, and add focused behavior coverage where new motion logic or keyboard behavior needs regression protection.

## Acceptance and testing strategy

The redesign is complete when all of these are verified:

1. All page sections use the new design language, and the hero silhouette connects visibly to the product reveal.
2. Desktop and mobile screenshots in both themes demonstrate readable typography, coherent spacing, no accidental clipping, and no horizontal page overflow. A first-time visitor sees dark; the theme toggle works by keyboard and touch, remembers an explicit choice, and reloads without a wrong-theme flash or hydration error. Switching theme preserves the selected demos and motion state.
3. Hero controls pause all continuous motion. Reduced motion, hidden-tab, offscreen, touch, no-WebGL, and data-saver paths remain usable.
4. CTA configuration works in signup and early-access modes, including the existing missing-destination and unavailable-endpoint states. No external form submission is required for visual tests.
5. Product tabs, all four AI workflows, source dialogs, FAQ disclosures, and the mobile menu retain their behavior and keyboard access.
6. Initial and interactive rendering produce no application page errors. Screenshot comparisons include the existing baseline and the redesigned default state.
7. Type checking, scoped lint, formatting, and the landing build pass. Browser checks exercise actual interactions and report their outcomes.
8. The lazy 3D enhancement stays off the initial mobile path. Test a desktop performance trace and check mobile loading, layout stability, and the absence of continuous layout work. Aim for CLS below 0.1 and LCP below 2.5 seconds under a documented representative mobile profile; distinguish laboratory results from field claims.
9. Code review covers correctness, readability, accessibility, architecture, security, and performance. Changed code and assets stay inside the landing scope, apart from its implementation record and evidence.

## Boundaries and review

Always preserve the existing configured behavior, feature truth, source attribution, and user changes. Keep shared UI packages and the other applications unchanged. Confirm keyboard behavior and motion fallbacks at runtime before committing a verified implementation increment.

Ask before widening the work into other applications, adding dependencies, changing CI or deployment configuration, or publishing. Never include credentials, third-party website assets in the shipped page, fabricated product claims, or a disabled security/launch check.

The repository-required spec-driven-development workflow calls for review of this specification before implementation planning and code changes. Approval can cover the whole redesign direction so subsequent routine layout and motion decisions do not need separate confirmations.

Confirmed preference: dark-themed first, with a complete light option. Open decision: approve or revise the clepsydra-to-product composition and the remaining design contract. The full-site redesign is the requested scope; no additional product capability is proposed.
