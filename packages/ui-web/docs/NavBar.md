---
category: Navigation
---

Compact mobile nav bar for detail screens: back label, mono identifier, plain icon actions.

```tsx
<NavBar
  back="Matters"
  title="2026-0187"
  mono
  actions={
    <>
      <IconButton plain icon="play" label="Start timer" />
      <IconButton plain icon="more" label="More" />
    </>
  }
/>
```
