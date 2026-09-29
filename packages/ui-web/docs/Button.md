---
category: Actions
---

The button: six variants, three sizes, verbs that name the outcome.

Variants: `primary` (one per view) · `secondary` (tonal companion, the default) · `outline` · `tertiary` (accent text) · `ghost` (dismiss) · `destructive` (tonal red) · `destructive-solid` (only the confirming step of a dialog). Sizes `sm` 36 · `md` 44 · `lg` 52 (the single call to action at the bottom of a sheet). `icon`/`iconRight` add icons; `iconOnly` makes a square icon button (give it `aria-label`); `block` fills the width; `loading` shows a spinner.

Copy: "Send invoice", "Record payment", "Bill 0.2h", "Text pay link". Money in a label always includes cents.

```tsx
<ButtonRow>
  <Button>Save draft</Button>
  <Button variant="primary" icon="send">
    Send for $8,125.00
  </Button>
</ButtonRow>
```
