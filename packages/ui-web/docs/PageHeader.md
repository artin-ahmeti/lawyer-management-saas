---
category: Navigation
---

Web page header: breadcrumbs, title, metadata, actions, in-page tabs.

Use `greeting` for the Today page ("Good morning, Dana.").

```tsx
<PageHeader
  crumbs={['Matters', 'Probate', <Mono ink>2026-0187</Mono>]}
  title="Estate of Harold Bennett"
  meta={
    <>
      <Pill tone="accent">Inventory</Pill>
      <Pill tone="outline">Hourly · $325</Pill>
    </>
  }
  actions={
    <>
      <Button icon="play">Start timer</Button>
      <Button variant="primary">New invoice</Button>
    </>
  }
  tabs={
    <SegmentedControl
      value="overview"
      items={[
        { value: 'overview', label: 'Overview' },
        { value: 'time', label: 'Time', count: 18 },
      ]}
    />
  }
/>
```
