import { Button, Dot, List, ListRow, TabBar, TimerBar, type TabBarItem } from '@lawfirm/ui-web';

const TABS: TabBarItem[] = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'matters', label: 'Matters', icon: 'briefcase' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'billing', label: 'Billing', icon: 'receipt' },
];

export const Running = () => (
  <div style={{ maxWidth: 358 }}>
    <TimerBar title="Estate of Harold Bennett" subtitle="Draft inventory schedules" time="00:42:17" />
  </div>
);

export const Paused = () => (
  <div style={{ maxWidth: 358 }}>
    <TimerBar paused title="People v. Marcus Webb" subtitle="Pretrial conference" time="01:12:04" />
  </div>
);

export const AboveTabBar = () => (
  <div style={{ maxWidth: 390 }}>
    <TimerBar title="Estate of Harold Bennett" subtitle="Draft inventory schedules" time="00:42:17" />
    <TabBar items={TABS} activeKey="today" />
  </div>
);

export const MultipleTimers = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<span className="cl-timerbar__dot" />}
        title="Estate of Harold Bennett"
        subtitle="Running · started 9:04"
        trail={
          <>
            <span className="cl-timerbar__time">00:42:17</span>
            <Button variant="secondary" size="sm" iconOnly icon="pause" aria-label="Pause" />
          </>
        }
      />
      <ListRow
        lead={<Dot tone="warning" />}
        title="People v. Marcus Webb"
        subtitle="Paused · pretrial conference"
        trail={
          <>
            <span className="cl-timerbar__time cl-muted">01:12:04</span>
            <Button variant="primary" size="sm" iconOnly icon="play" aria-label="Resume" />
          </>
        }
      />
    </List>
  </div>
);
