# design/

The Clepso design system: the review page, its sources, and the bundle that Claude Design consumes. Nothing in here is wired into the apps yet; the implementation order is in `system/preview.html` (section 08) and in the audit below.

```
design/
├── README.md                          this file
├── audit-2026-09-current-system.md    why the current UI is being replaced, with file references
├── src/                               SOURCES — edit these
│   ├── tokens.py                      every token (single source of truth)
│   ├── bundle.css                     component classes (cl-*)
│   ├── base.css · page.css · page.js  preview-shell and review-page chrome
│   ├── icons.svg                      inline icon sprite used by previews
│   ├── guidelines.py                  README text per component
│   ├── previews/*.html                one fragment per component card
│   ├── screens/*.html                 one fragment per screen mockup
│   ├── page/*.html                    the review page narrative
│   ├── build_tokens.py                tokens.py → tokens.json / tokens.css / contrast-report.md
│   └── build.py                       everything → system/
└── system/                            GENERATED — the /design-sync bundle
    ├── README.md                      brand book (start here; hand-written, not generated)
    ├── tokens.json · tokens.css · contrast-report.md
    ├── components/bundle.css
    ├── components/<Name>/preview.html + README.md   52 cards, @dsCard marker on line 1
    ├── assets/icons/sprite.svg
    ├── cards.json                     index of cards (path, group, name, height)
    └── preview.html                   the whole system on one page (open locally)
```

## Review it

- Open `design/system/preview.html` in a browser, or the published artifact linked in the proposal message. Use the Theme switch at the top; every component and screen re-renders in light or courthouse mode.
- Component-by-component: `design/system/components/<Name>/preview.html`.

## Rebuild after editing sources

```sh
python3 design/src/build.py
```

Prints tag-balance warnings (there is no renderer in CI) and rewrites `design/system/**` except `README.md`. Pass `--artifact <path>` to also emit the artifact-flavoured page.

## Push to Claude Design (`/design-sync`)

Claude Design consumes a compiled React library, not this folder directly. The library is `packages/ui-web` (`@lawfirm/ui-web`): thin React DOM components over this stylesheet, whose `dist/clepso.css` is assembled from `design/system/tokens.css` + `design/system/components/bundle.css`. The sync inputs live in `.design-sync/` (`config.json`, `NOTES.md`, `conventions.md`, `previews/*.tsx`), and the built upload bundle in `ds-bundle/` (gitignored).

1. Change styles in `design/src`, then `python3 design/src/build.py`, then `pnpm --filter @lawfirm/ui-web build`.
2. In Claude Code, run `/design-sync` (needs `/design-login` once). It rebuilds `ds-bundle/`, verifies every preview card in headless Chromium, and uploads what changed to the **Clepso** project.
3. New components: add them to `packages/ui-web`, a `docs/<Name>.md`, and a `.design-sync/previews/<Name>.tsx`; re-run `/design-sync`.

## Decisions

Settled on 2026-09-29: accent **Cobalt**, product name **Clepso**, sans-only type (Geist + Geist Mono), tight radii. Still open: the H1 tab bar (Today · Matters · Capture · Calendar · Billing recommended) and a real logo to replace the placeholder mark. See section 09 of the review page.
