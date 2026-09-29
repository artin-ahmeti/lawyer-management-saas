---
category: Navigation
---

Web application frame: sidebar, top bar, main content, optional drawer.

```tsx
<ClepsoRoot density="web">
  <AppShell
    sidebar={<Sidebar firm="Tran & Okafor LLP">…</Sidebar>}
    topbar={<TopBar />}
    drawer={<Drawer>…</Drawer>}
  >
    <PageHeader title="Matters" />
  </AppShell>
</ClepsoRoot>
```
