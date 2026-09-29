import { ClepsoRoot, IconButton } from '@lawfirm/ui-web';

export const HeaderActions = () => (
  <div className="cl-inline">
    <IconButton icon="inbox" label="Inbox" badge={3} />
    <IconButton icon="search" label="Search" />
    <IconButton icon="bell" label="Notifications" badge="9+" />
    <IconButton icon="more" label="More" plain />
  </div>
);

export const SizesAndPlain = () => (
  <div className="cl-inline">
    <IconButton icon="settings" label="Settings" />
    <IconButton icon="x" label="Close" size="sm" />
    <IconButton icon="more" label="More" plain />
    <IconButton icon="x" label="Close" size="sm" plain />
    <IconButton icon="message" label="Messages" badge={1} plain />
  </div>
);

export const Dark = () => (
  <ClepsoRoot theme="dark" style={{ padding: 12, borderRadius: 12 }}>
    <div className="cl-inline">
      <IconButton icon="inbox" label="Inbox" badge={3} />
      <IconButton icon="search" label="Search" />
      <IconButton icon="more" label="More" plain />
      <IconButton icon="x" label="Close" size="sm" />
    </div>
  </ClepsoRoot>
);
