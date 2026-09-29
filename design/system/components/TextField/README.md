# Text field
Label above, control, help or error below; 48px on mobile and 40 on web.

**Anatomy.** `cl-field` › `cl-field__label` (label style, ink-secondary, optional "Optional" tag) › `cl-input` (hairline `line-border`, radius md/sm) › `cl-field__help` (caption).

**States.** Focus: accent border + 3px `focus-ring`. Error: `danger-dot` border, red help text that says what to do. Disabled: `surface-sunken` with `ink-disabled`. Search: tonal, borderless, becomes a surface on focus.

**Affixes.** Leading icons in `ink-tertiary`; text affixes (currency, "/ hr") in body-strong `ink-secondary`.
