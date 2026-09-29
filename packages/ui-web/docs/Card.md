---
category: Data display
---

A card marks the one thing that isn't a list item; lists live in List, not in cards.

Use for the running timer, Review your day, Who to nudge, a deadline, a trust warning. Tones: `tint` (accent), `ink`, `raised`, `warning`, `danger`. `flush` removes padding when a `List flat` sits inside. `footer` takes a row of small buttons.

```tsx
<Card
  title="Who to nudge"
  subtitle="$8,125.00 overdue"
  headerAction={
    <Button variant="tertiary" size="sm">
      All AR
    </Button>
  }
  flush
  footer={
    <>
      <Button variant="primary" size="sm" icon="send">
        Text pay link
      </Button>
      <Button size="sm">Offer a plan</Button>
    </>
  }
>
  <List flat style={{ padding: '0 16px' }}>
    …
  </List>
</Card>
```
