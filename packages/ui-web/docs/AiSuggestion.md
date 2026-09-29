---
category: Inputs
---

Opt-in AI suggestion under a field: grey, labelled, never auto-applied.

Nothing changes until the user taps an action. Label it plainly ("Suggested cleanup · not applied"). No purple, no sparkles. Carries the disclosure sentence where a bar rule requires it.

```tsx
<AiSuggestion
  label="Suggested cleanup · not applied"
  text="Telephone conference with opposing counsel regarding warranty provisions."
  actions={[
    { label: 'Use this' },
    { label: 'Edit', quiet: true },
    { label: 'Dismiss', quiet: true },
  ]}
/>
```
