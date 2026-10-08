'use client';

import { Avatar, Button, Icon, IconWell, Text } from '@lawfirm/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAlerts, useWrites } from '@/lib/data';
import { CURRENT_USER } from '@/lib/data/fixtures';
import { clock } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import {
  elapsedMs,
  isTimerPaused,
  useTimerHydrated,
  useTimerSeconds,
  useTimerStore,
} from '@/stores/timer';
import { useSidebar } from '@/lib/sidebar';
import { useOverlays } from '@/stores/ui';
import { useStaffShell } from '@/lib/staff-shell';
import { previewMode } from '@/lib/env';

export function AppTopBar() {
  const staff = useStaffShell();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const openPalette = useOverlays((s) => s.openPalette);
  const openCapture = useOverlays((s) => s.openCapture);
  const { scheme, toggle: toggleTheme } = useTheme();
  return (
    <div className="cl-topbar" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      <button
        type="button"
        className="cl-btn cl-btn--ghost cl-btn--icon"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-controls="app-sidebar"
        aria-expanded={!sidebarCollapsed}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={toggleSidebar}
      >
        <Icon name="panel" />
      </button>
      <button
        type="button"
        className="cl-topbar__search"
        onClick={openPalette}
        style={{
          cursor: 'text',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
          flex: '0 1 460px',
          border: 0,
          textAlign: 'left',
        }}
      >
        <Icon name="search" size="sm" />
        <span className="cl-truncate" style={{ minWidth: 0 }}>
          Search or jump to…
        </span>
        <span className="cl-kbd">⌘K</span>
      </button>
      <div className="cl-topbar__right" style={{ flex: 'none' }}>
        <TimerWidget />
        <Button variant="primary" icon="plus" aria-label="Capture" onClick={() => openCapture()}>
          <span className="app-capture-label">Capture</span>
        </Button>
        <AlertsButton />
        <button
          type="button"
          className="cl-btn cl-btn--ghost cl-btn--icon"
          aria-label={scheme === 'dark' ? 'Switch to light theme' : 'Switch to courthouse mode'}
          onClick={toggleTheme}
        >
          <Icon name={scheme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <Link href="/settings" aria-label="Your profile" style={{ display: 'inline-flex' }}>
          <Avatar
            size="sm"
            tone="accent"
            initials={previewMode ? CURRENT_USER.initials : staff.initials}
          />
        </Link>
      </div>
    </div>
  );
}

/** Running timer in the top bar: pause/stop while running, resume while paused; stop opens Log time. */
function TimerWidget() {
  const hydrated = useTimerHydrated();
  const matterId = useTimerStore((s) => s.matterId);
  const matterTitle = useTimerStore((s) => s.matterTitle);
  const activity = useTimerStore((s) => s.activity);
  const paused = useTimerStore(isTimerPaused);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const seconds = useTimerSeconds();
  const openCapture = useOverlays((s) => s.openCapture);
  if (!hydrated || matterId === null) return null;

  const stopAndLog = () => {
    pause();
    const ms = elapsedMs(useTimerStore.getState());
    openCapture('Log time', {
      matterId,
      minutes: Math.max(6, Math.ceil(ms / 60000 / 6) * 6),
      narrative: activity ?? '',
      fromTimer: true,
    });
  };
  const short = (matterTitle ?? '').replace('Estate of Harold Bennett', 'Estate of Bennett');
  const btn: React.CSSProperties = {
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    color: 'inherit',
  };
  return (
    <div
      className="cl-topbar__timer"
      style={paused ? { background: 'var(--warning-bg)', color: 'var(--warning-ink)' } : undefined}
    >
      <span
        className="cl-timerbar__dot"
        style={paused ? { animation: 'none', background: 'var(--warning-dot)' } : undefined}
      />
      <span className="title cl-truncate">{paused ? `Paused · ${short}` : short}</span>
      <span className="time">{clock(seconds)}</span>
      {paused ? (
        <>
          <button type="button" aria-label="Resume" onClick={resume} style={btn}>
            <Icon name="play" size="sm" />
          </button>
          <button type="button" aria-label="Stop and log" onClick={stopAndLog} style={btn}>
            <Icon name="stop" size="sm" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label="Pause"
            onClick={pause}
            style={{ ...btn, color: 'var(--accent-ink)' }}
          >
            <Icon name="pause" size="sm" />
          </button>
          <button
            type="button"
            aria-label="Stop and log"
            onClick={stopAndLog}
            style={{ ...btn, color: 'var(--accent-ink)' }}
          >
            <Icon name="stop" size="sm" />
          </button>
        </>
      )}
    </div>
  );
}

function AlertsButton() {
  const alerts = useAlerts();
  const open = useOverlays((s) => s.alertsOpen);
  const setOpen = useOverlays((s) => s.setAlertsOpen);
  const { markAlertsRead } = useWrites();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const count = alerts.data?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="cl-btn cl-btn--ghost cl-btn--icon"
        aria-label={`Alerts, ${count} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" />
        {count > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              font: '600 10px/16px var(--font-sans)',
              textAlign: 'center',
              padding: '0 4px',
            }}
          >
            {count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="app-pop app-alerts"
          style={{
            position: 'absolute',
            right: 0,
            top: 44,
            width: 'min(360px, calc(100vw - 32px))',
            background: 'var(--surface-3)',
            border: '1px solid var(--hairline)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 40,
            overflow: 'hidden',
          }}
        >
          <div
            className="cl-spread"
            style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}
          >
            <Text variant="body-strong">Alerts</Text>
            <button
              type="button"
              className="cl-link"
              style={{ font: 'var(--text-caption)', fontWeight: 600 }}
              onClick={() => {
                markAlertsRead();
                setOpen(false);
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="cl-list cl-list--flat">
            {count === 0 ? (
              <div className="cl-t-body-sm cl-muted" style={{ padding: '14px' }}>
                You’re caught up.
              </div>
            ) : null}
            {alerts.data?.map((a) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className="cl-row cl-row--pressable"
                style={{ padding: '10px 14px' }}
                onClick={() => {
                  setOpen(false);
                  router.push(a.href);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setOpen(false);
                    router.push(a.href);
                  }
                }}
              >
                <IconWell name={a.icon as never} tone={a.tone} />
                <div className="cl-row__body">
                  <div className="cl-row__title" style={{ whiteSpace: 'normal' }}>
                    {a.title}
                  </div>
                  <div className="cl-row__sub">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
