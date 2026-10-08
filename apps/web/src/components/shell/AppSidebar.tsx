'use client';

import { Avatar, BrandMark, Icon, ProgressBar } from '@lawfirm/ui-web';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import {
  useAlerts,
  useBilledExtraMinutes,
  useMatters,
  useReviewItems,
  useSettings,
  useTasks,
} from '@/lib/data';
import { CURRENT_USER, FIRM, TODAY_METRICS } from '@/lib/data/fixtures';
import { hoursFromDecimal, moneyShort } from '@/lib/format';
import { NAV, activeNavKey } from '@/lib/routes';
import { useSidebar } from '@/lib/sidebar';
import { useStaffShell } from '@/lib/staff-shell';
import { previewMode } from '@/lib/env';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * The sidebar renders the same markup expanded and collapsed. Collapsing only
 * narrows the column: icons keep a fixed x (the collapsed width is chosen so
 * they are already centred), labels and counts fade and are clipped, and no row
 * changes height. The rules live under `.app-sidebar` in globals.css.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  const { collapsed, toggle } = useSidebar();
  const tasks = useTasks();
  const alerts = useAlerts();
  const matters = useMatters();
  const settings = useSettings();
  const firm = settings.data?.firm ?? FIRM;
  const staff = useStaffShell();
  const firmName = previewMode ? firm.name : staff.firmName;
  const review = useReviewItems();
  const extra = useBilledExtraMinutes();

  const openTasks = tasks.data?.filter((t) => !t.done).length;
  // The Inbox badge counts what needs attention now (the unread alerts), not every thread.
  const inboxCount = alerts.data?.length || undefined;
  const billedToday = (TODAY_METRICS.billedTodayMinutes + (extra.data ?? 0)) / 60;
  const goal = TODAY_METRICS.dailyGoalMinutes / 60;
  const pacePct = Math.min(100, Math.round((billedToday / goal) * 100));
  const paceNote =
    billedToday >= goal
      ? 'Goal reached · nice.'
      : `${hoursFromDecimal(goal - billedToday)} to goal · ${review.data?.length ?? 0} to review`;
  const counts: Record<string, number | undefined> = {
    matters: previewMode ? matters.data?.length : undefined,
    tasks: openTasks,
  };

  const navWithGroups = NAV.map((n, i) => ({
    ...n,
    groupHeader: n.group && NAV[i - 1]?.group !== n.group ? n.group : undefined,
  }));

  return (
    <aside id="app-sidebar" className="cl-sidebar app-sidebar" aria-label="Main navigation">
      <Link
        href="/settings"
        className="cl-navitem app-navitem app-sidebar__firm"
        aria-label={`${firmName} · firm settings`}
        title={firmName}
      >
        <BrandMark tone="accent" className="app-sidebar-mark" />
        <span className="app-sidebar__label app-sidebar__stack">
          <span className="cl-t-label cl-truncate app-sidebar__firm-name">{firmName}</span>
          <span className="cl-t-caption cl-muted">
            {previewMode ? `Firm plan · ${firm.plan.seats} seats` : 'Current workspace'}
          </span>
        </span>
        <span className="app-sidebar__trail app-sidebar__chevron">
          <Icon name="chevron-down" size="sm" />
        </span>
      </Link>

      {navWithGroups.map((n) => {
        const count = n.key === 'inbox' ? inboxCount : counts[n.key];
        const badge = n.key === 'inbox';
        return (
          <Fragment key={n.key}>
            {n.groupHeader ? (
              <div className="cl-sidebar__group app-sidebar__group">
                <span className="app-sidebar__group-text">{n.groupHeader}</span>
              </div>
            ) : null}
            <Link
              href={n.href}
              title={n.label}
              aria-label={
                count === undefined
                  ? undefined
                  : `${n.label}, ${count} ${badge ? 'unread' : n.key === 'tasks' ? 'open' : 'total'}`
              }
              aria-current={active === n.key ? 'page' : undefined}
              className={cx('cl-navitem', 'app-navitem', active === n.key && 'is-active')}
            >
              <Icon name={n.icon} />
              <span className="app-sidebar__label cl-truncate">{n.label}</span>
              {count !== undefined ? (
                <span
                  className={cx('cl-navitem__count', 'app-sidebar__trail', badge && 'is-badge')}
                >
                  {count}
                </span>
              ) : null}
              {/* Collapsed rail: unread badges shrink to a dot on the icon. */}
              {badge && count !== undefined ? (
                <span className="app-navitem__dot" aria-hidden="true" />
              ) : null}
            </Link>
          </Fragment>
        );
      })}

      <div className="cl-sidebar__spacer app-sidebar__spacer" />
      <Link
        href="/settings"
        title="Settings"
        aria-current={active === 'settings' ? 'page' : undefined}
        className={cx('cl-navitem', 'app-navitem', active === 'settings' && 'is-active')}
      >
        <Icon name="settings" />
        <span className="app-sidebar__label cl-truncate">Settings</span>
      </Link>

      <div
        className="app-sidebar__pace"
        role="group"
        aria-label={`Today’s pace: ${billedToday.toFixed(1)} of ${goal} hours`}
        title={`Today’s pace · ${billedToday.toFixed(1)} / ${goal}h · ${paceNote}`}
      >
        <div className="app-sidebar__pace-body">
          <div className="cl-spread">
            <span className="cl-t-caption app-sidebar__pace-title">Today’s pace</span>
            <span className="cl-t-caption cl-num">
              {billedToday.toFixed(1)} / {goal}h
            </span>
          </div>
          <ProgressBar value={pacePct} className="app-sidebar__pace-bar" />
          <div className="cl-t-caption app-sidebar__pace-note">{paceNote}</div>
        </div>
        {/* Collapsed rail: the same progress as a vertical meter on the icon axis. */}
        <div className="app-sidebar__pace-meter" aria-hidden="true">
          <span style={{ height: `${pacePct}%` }} />
        </div>
      </div>

      <div className="app-sidebar__footer">
        <Link href="/settings" aria-label="Your profile" className="app-sidebar__avatar">
          <Avatar
            size="sm"
            tone="accent"
            initials={previewMode ? CURRENT_USER.initials : staff.initials}
          />
        </Link>
        <span className="app-sidebar__label app-sidebar__stack">
          <span className="cl-t-label cl-truncate app-sidebar__user-name">
            {previewMode ? CURRENT_USER.name : staff.userName}
          </span>
          <span className="cl-t-caption cl-muted">
            {previewMode ? `Owner · ${moneyShort(CURRENT_USER.rateCents)}/h` : staff.roleLabel}
          </span>
        </span>
        <button
          type="button"
          className="cl-btn cl-btn--ghost cl-btn--icon app-sidebar__trail app-sidebar__collapse"
          aria-label="Collapse sidebar"
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
          aria-hidden={collapsed || undefined}
          tabIndex={collapsed ? -1 : undefined}
          onClick={toggle}
        >
          <Icon name="chevron-left" size="sm" />
        </button>
      </div>
    </aside>
  );
}
