# Colors
Semantic colour tokens for light and dark, with one accent and four reserved status hues.

**Use** `surface-*` for layers, `line-*` for edges, `ink-*` for text, `accent-*` for action and selection, `status-*` for state. Never reach for the raw `neutral-*` ramp in a component.

**Themes.** Light is the default. Dark ("courthouse mode") is a designed set: canvas `#12151B`, surfaces step lighter, hairlines become `#262C36`, the accent lifts to a mint that passes 4.5:1 on dark surfaces. Do not invert light values.

**Accent.** Cobalt (`#2B52D9` light, `#88A3FF` dark) is the one accent. It means act or selected: primary buttons, the active tab, links, the current stage, the running-timer dot, selected rows. Info state is teal so court and system pills never look like the accent.

**Rules.** Text on any surface ≥ 4.5:1; icons, control edges and status dots ≥ 3:1 (see `contrast-report.md`). Status colours never decorate and never appear in charts. One accent-filled element per view.
