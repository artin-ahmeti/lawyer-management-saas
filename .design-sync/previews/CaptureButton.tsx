import { CaptureButton, ClepsoRoot, IconButton } from '@lawfirm/ui-web';

export const Capture = () => (
  <div className="cl-inline">
    <IconButton icon="inbox" label="Inbox" badge={3} />
    <IconButton icon="search" label="Search" />
    <CaptureButton />
  </div>
);

export const Dark = () => (
  <ClepsoRoot theme="dark" style={{ padding: 12, borderRadius: 12 }}>
    <div className="cl-inline">
      <IconButton icon="inbox" label="Inbox" badge={3} />
      <IconButton icon="search" label="Search" />
      <CaptureButton />
    </div>
  </ClepsoRoot>
);
