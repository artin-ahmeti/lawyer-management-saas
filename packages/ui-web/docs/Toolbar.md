---
category: Data display
---

Table toolbar: search, chips, and a right-aligned cluster.

```tsx
<Toolbar
  right={
    <Button variant="primary" icon="plus">
      New matter
    </Button>
  }
>
  <Input search icon="search" placeholder="Search matters" style={{ width: 240 }} />
  <Chip active count={9}>
    Open
  </Chip>
</Toolbar>
```
