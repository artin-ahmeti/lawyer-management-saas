import { Avatar, Button, IconButton, TopBar } from '@lawfirm/ui-web';

const Right = () => (
  <>
    <Button variant="primary" icon="plus">
      Capture
    </Button>
    <IconButton icon="bell" label="Alerts" badge={2} />
    <Avatar size="sm" tone="accent" initials="DO" />
  </>
);

export const RunningTimer = () => (
  <div
    className="cl-web"
    style={{
      border: '1px solid var(--hairline)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--bg)',
    }}
  >
    <TopBar timer={{ title: 'Estate of Bennett', time: '00:42:17' }} right={<Right />} />
  </div>
);

export const PausedTimer = () => (
  <div
    className="cl-web"
    style={{
      border: '1px solid var(--hairline)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--bg)',
    }}
  >
    <TopBar
      timer={{ title: 'People v. Webb', time: '01:12:04', paused: true }}
      right={
        <>
          <Button variant="primary" icon="plus">
            Capture
          </Button>
          <IconButton icon="bell" label="Alerts" />
          <Avatar size="sm" tone="accent" initials="DO" />
        </>
      }
    />
  </div>
);

export const NoTimer = () => (
  <div
    className="cl-web"
    style={{
      border: '1px solid var(--hairline)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--bg)',
    }}
  >
    <TopBar
      searchPlaceholder="Search or jump to… matters, contacts, invoices, “start timer”"
      right={<Right />}
    />
  </div>
);
