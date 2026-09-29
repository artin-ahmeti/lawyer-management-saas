---
category: Foundations
---

Root wrapper that applies the Clepso base font, ink and canvas and scopes theme and density.

Wrap every screen or page in `ClepsoRoot`. Without it, components keep their own styles but inherit the host page's font and background.

- `theme="dark"` renders courthouse mode for the subtree; omit to follow the system.
- `density="web"` switches to desktop density (36px controls, 44px table rows, 14px body). Use it for every web page; mobile screens use the default.

```tsx
<ClepsoRoot density="web">
  <AppShell sidebar={<Sidebar firm="Tran & Okafor LLP">…</Sidebar>} topbar={<TopBar />}>
    …
  </AppShell>
</ClepsoRoot>
```
