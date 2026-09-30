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
import { useUiPrefs } from '@/stores/ui';

export function AppSidebar() {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  const collapsed = useUiPrefs((s) => s.sidebarCollapsed);
  const toggle = useUiPrefs((s) => s.toggleSidebar);
  const tasks = useTasks();
  const alerts = useAlerts();
  const matters = useMatters();
  const settings = useSettings();
  const firm = settings.data?.firm ?? FIRM;
  const review = useReviewItems();
  const extra = useBilledExtraMinutes();

  const openTasks = tasks.data?.filter((t) => !t.done).length;
  // The Inbox badge counts what needs attention now (the unread alerts), not every thread.
  const inboxCount = alerts.data?.length || undefined;
  const billedToday = (TODAY_METRICS.billedTodayMinutes + (extra.data ?? 0)) / 60;
  const goal = TODAY_METRICS.dailyGoalMinutes / 60;
  const pacePct = Math.min(100, Math.round((billedToday / goal) * 100));
  const counts: Record<string, number | undefined> = {
    matters: matters.data?.length,
    tasks: openTasks,
  };

  const navWithGroups = NAV.map((n, i) => ({
    ...n,
    groupHeader: n.group && NAV[i - 1]?.group !== n.group ? n.group : undefined,
  }));
  return (
    <aside
      className="cl-sidebar app-sidebar"
      style={{
        padding: collapsed ? '12px 10px' : 12,
        gap: 2,
        borderRight: '1px solid var(--hairline)',
      }}
    >
      <Link
        href="/settings"
        className="cl-navitem app-navitem"
        style={{
          height: 48,
          marginBottom: 8,
          borderRadius: 10,
          background: 'var(--surface)',
          boxShadow: 'inset 0 0 0 1px var(--hairline), var(--shadow-sm)',
          color: 'var(--ink)',
          padding: collapsed ? 0 : '0 10px',
        }}
        aria-label="Firm settings"
      >
        <BrandMark tone="accent" className="app-sidebar-mark" />
        <span className="app-sidebar__label">
          <span
            className="cl-t-label cl-truncate"
            style={{ fontWeight: 600, color: 'var(--ink)', maxWidth: '100%' }}
          >
            {firm.name}
          </span>
          <span className="cl-t-caption cl-muted" style={{ whiteSpace: 'nowrap' }}>
            Firm plan · {firm.plan.seats} seats
          </span>
        </span>
        <span
          className="app-sidebar__trail"
          style={{ color: 'var(--ink-3)', display: 'inline-flex' }}
        >
          <Icon name="chevron-down" size="sm" />
        </span>
      </Link>

      {navWithGroups.map((n) => {
        const { groupHeader } = n;
        const count = n.key === 'inbox' ? inboxCount : counts[n.key];
        return (
          <Fragment key={n.key}>
            {groupHeader ? (
              <div
                className="cl-sidebar__group app-sidebar__group"
                style={{
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  padding: collapsed ? '14px 0 4px' : undefined,
                }}
              >
                {groupHeader}
              </div>
            ) : null}
            <Link
              href={n.href}
              title={n.label}
              aria-current={active === n.key ? 'page' : undefined}
              className={['cl-navitem', 'app-navitem', active === n.key && 'is-active']
                .filter(Boolean)
                .join(' ')}
              style={{ textDecoration: 'none' }}
            >
              <Icon name={n.icon} />
              <span className="app-sidebar__label cl-truncate" style={{ display: 'block' }}>
                {n.label}
              </span>
              {count !== undefined ? (
                <span
                  className={[
                    'cl-navitem__count',
                    'app-sidebar__trail',
                    n.key === 'inbox' && 'is-badge',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ marginLeft: 0 }}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </Fragment>
        );
      })}

      <div className="cl-sidebar__spacer" style={{ minHeight: 12 }} />
      <Link
        href="/settings"
        title="Settings"
        aria-current={active === 'settings' ? 'page' : undefined}
        className={['cl-navitem', 'app-navitem', active === 'settings' && 'is-active']
          .filter(Boolean)
          .join(' ')}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="settings" />
        <span className="app-sidebar__label cl-truncate" style={{ display: 'block' }}>
          Settings
        </span>
      </Link>

      {!collapsed ? (
        <div
          className="app-fade"
          style={{
            flex: 'none',
            margin: '8px 0 6px',
            padding: 12,
            borderRadius: 10,
            background: 'var(--accent-tint)',
          }}
        >
          <div className="cl-spread">
            <span className="cl-t-caption" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>
              Today’s pace
            </span>
            <span className="cl-t-caption cl-num" style={{ color: 'var(--accent-ink)' }}>
              {billedToday.toFixed(1)} / {goal}h
            </span>
          </div>
          <ProgressBar
            value={pacePct}
            style={{ background: 'color-mix(in oklab, var(--accent), transparent 80%)' }}
          />
          <div className="cl-t-caption" style={{ marginTop: 8, color: 'var(--accent-ink)' }}>
            {billedToday >= goal
              ? 'Goal reached · nice.'
              : `${hoursFromDecimal(goal - billedToday)} to goal · ${review.data?.length ?? 0} to review`}
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '12px 0 6px' : '12px 10px 6px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderTop: '1px solid var(--hairline)',
          marginTop: 6,
        }}
      >
        <Link href="/settings" aria-label="Your profile" style={{ display: 'inline-flex' }}>
          <Avatar size="sm" tone="accent" initials={CURRENT_USER.initials} />
        </Link>
        <span className="app-sidebar__label">
          <span className="cl-t-label cl-truncate" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {CURRENT_USER.name}
          </span>
          <span className="cl-t-caption cl-muted" style={{ whiteSpace: 'nowrap' }}>
            Owner · {moneyShort(CURRENT_USER.rateCents)}/h
          </span>
        </span>
        <button
          type="button"
          className="cl-btn cl-btn--ghost cl-btn--icon app-sidebar__trail"
          aria-label="Collapse sidebar"
          onClick={toggle}
          style={{ flex: 'none', width: 30, height: 30, padding: 0 }}
        >
          <Icon name="chevron-left" size="sm" />
        </button>
      </div>
    </aside>
  );
}
