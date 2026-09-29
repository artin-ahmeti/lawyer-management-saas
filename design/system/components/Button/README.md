# Button
Six variants and three sizes; one primary per view; labels are verbs that name the outcome.

**Variants.** `primary` (accent fill) · `secondary` (tonal, the default companion) · `outline` (on busy surfaces) · `tertiary` (accent text, low emphasis) · `ghost` (dismiss) · `destructive` (tonal red) and `destructive-solid` (only the confirming step of a dialog).

**Sizes.** sm 36 (inline in rows and banners) · md 44 (mobile default) · lg 52 (the single call to action at the bottom of a sheet/form). On web, md becomes 36 and lg 44 (`.cl-web`).

**States.** hover (web) darkens; pressed scales to 0.985; focus-visible shows a 2px `focus-ring` at 2px offset; disabled is 45% opacity; loading replaces the label with a spinner and blocks input.

**Copy.** "Send invoice", "Record payment", "Bill 0.2h", "Text pay link". Money in a label always includes cents.
