---
category: Feedback
---

Confirmation dialog: the consequence in the body, the verb on the button.

Title asks the question with the amount or object in it. Actions: a ghost dismiss and one primary (or `destructive-solid`) verb. Wrap in `Scrim center` to show it over a screen.

```tsx
<Dialog
  title="Send invoice for $8,125.00?"
  text="Margaret Bennett gets a text and email with a pay link. ACH is offered first; card adds 2.9%."
  actions={
    <>
      <Button variant="ghost">Not yet</Button>
      <Button variant="primary">Send invoice</Button>
    </>
  }
/>
```
