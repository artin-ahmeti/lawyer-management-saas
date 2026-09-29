import { Avatar, IconButton, ScreenHeader } from '@lawfirm/ui-web';

export const TodayGreeting = () => (
  <div style={{ maxWidth: 358 }}>
    <ScreenHeader
      eyebrow="Monday, September 29"
      title="Good morning, Dana."
      actions={
        <>
          <IconButton icon="inbox" label="Inbox" badge={3} />
          <Avatar tone="accent" initials="DO" />
        </>
      }
    />
  </div>
);

export const Matters = () => (
  <div style={{ maxWidth: 358 }}>
    <ScreenHeader
      title="Matters"
      actions={
        <>
          <IconButton icon="search" label="Search" />
          <IconButton icon="plus" label="New matter" />
        </>
      }
    />
  </div>
);

export const Inbox = () => (
  <div style={{ maxWidth: 358 }}>
    <ScreenHeader
      eyebrow="3 unread · 2 need a reply"
      title="Inbox"
      actions={<IconButton icon="sliders" label="Filter" />}
    />
  </div>
);
