---
category: Feedback
---

Bottom sheet: every create and edit flow on mobile.

Grabber, title row, content, one `lg` primary button at the bottom that names the outcome with the amount. Place in `PhoneFrame overlay={<Scrim>…</Scrim>}`.

```tsx
<Scrim>
  <Sheet
    title="Record payment"
    headerRight={<IconButton plain size="sm" icon="x" label="Close" />}
    style={{ width: '100%' }}
  >
    <Form>…</Form>
    <Button variant="primary" size="lg" block>
      Record $8,125.00
    </Button>
  </Sheet>
</Scrim>
```
