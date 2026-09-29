---
category: Frames
---

A 390×844 phone with status bar, island and home indicator for presenting mobile screens.

Put the screen in `children`, the TimerBar and TabBar in `bottom`, and a `Scrim` with a Sheet or Dialog in `overlay`. `dark` shows courthouse mode for that phone only.

```tsx
<PhoneFrame
  bottom={
    <>
      <TimerBar title="Estate of Bennett" time="00:42:17" />
      <TabBar activeKey="today" items={TABS} />
    </>
  }
>
  <ScreenHeader eyebrow="Monday, September 29" title="Good morning, Dana." />…
</PhoneFrame>
```
