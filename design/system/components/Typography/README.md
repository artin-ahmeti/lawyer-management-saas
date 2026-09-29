# Typography
Two families with strict jobs: Geist for everything you read, Geist Mono for identifiers and timers.

**Scale.** display 32/38 · title-1 28/34 · title-2 22/28 · title-3 17/24 · body 15/22 · body-sm 14/20 · label 13/18 · caption 12/16 · overline 11/16 caps · amount-lg 28/34 · amount 17/24 · mono-id 13/18 · mono-timer 40/44. Titles at 22px and above tighten to −0.02em.

**Rules.** Numbers are always tabular (`font-variant-numeric: tabular-nums`). Cents render in `ink-secondary`. Identifiers (matter/invoice numbers, UTBMS codes, account suffixes) are mono. There is no display face: the Today greeting is title-1 on mobile and display on web. Uppercase only at the 11px overline with +0.06em tracking. Hierarchy comes from size, weight (400/500/600) and space, not colour.

**Mobile.** Load with `@expo-google-fonts/geist` and `@expo-google-fonts/geist-mono`. **Web.** Google Fonts link or self-hosted woff2; fallbacks are the system stacks in `tokens.css`.
