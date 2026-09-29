import { ClepsoRoot, TabBar, TimerBar, type TabBarItem } from '@lawfirm/ui-web';

const STAFF: TabBarItem[] = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'matters', label: 'Matters', icon: 'briefcase' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'billing', label: 'Billing', icon: 'receipt' },
];

const CLIENT: TabBarItem[] = [
  { key: 'case', label: 'Case', icon: 'home' },
  { key: 'messages', label: 'Messages', icon: 'message' },
  { key: 'upload', label: 'Upload', icon: 'upload' },
  { key: 'payments', label: 'Payments', icon: 'receipt' },
];

export const WithTimer = () => (
  <div
    style={{
      maxWidth: 358,
      paddingTop: 80,
      border: '1px solid var(--hairline)',
      borderRadius: '0 0 20px 20px',
      background: 'var(--bg)',
    }}
  >
    <div className="cl-phone__bottom">
      <TimerBar
        title="Estate of Harold Bennett"
        subtitle="Draft inventory schedules"
        time="00:42:17"
      />
      <TabBar activeKey="today" items={STAFF} />
      <div className="cl-phone__home" />
    </div>
  </div>
);

export const ClientApp = () => (
  <div
    style={{
      maxWidth: 358,
      paddingTop: 24,
      border: '1px solid var(--hairline)',
      borderRadius: '0 0 20px 20px',
      background: 'var(--bg)',
    }}
  >
    <div className="cl-phone__bottom">
      <TabBar activeKey="case" items={CLIENT} capture={false} />
      <div className="cl-phone__home" />
    </div>
  </div>
);

export const PausedCourthouse = () => (
  <div style={{ maxWidth: 358 }}>
    <ClepsoRoot
      theme="dark"
      style={{
        paddingTop: 80,
        border: '1px solid var(--hairline)',
        borderRadius: '0 0 20px 20px',
      }}
    >
      <div className="cl-phone__bottom">
        <TimerBar
          title="People v. Marcus Webb"
          subtitle="Paused · Pretrial conference"
          time="01:12:04"
          paused
        />
        <TabBar activeKey="matters" items={STAFF} />
        <div className="cl-phone__home" />
      </div>
    </ClepsoRoot>
  </div>
);
