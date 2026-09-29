---
category: Data display
---

Vertical activity feed: actor, action, object and time.

```tsx
<Timeline
  events={[
    {
      icon: 'dollar',
      tone: 'accent',
      title: (
        <>
          <b>Payment received</b> · $2,000.00 by ACH
        </>
      ),
      meta: 'Today 8:12 AM',
    },
    {
      icon: 'message',
      title: (
        <>
          <b>L. Tran</b> sent a client update
        </>
      ),
      meta: 'Yesterday · visible to client',
      quote: 'We filed the inventory with the court today.',
    },
  ]}
/>
```
