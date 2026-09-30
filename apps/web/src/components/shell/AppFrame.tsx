'use client';

import { useEffect, type ReactNode } from 'react';
import { dataMode } from '@/lib/env';
import { useOverlays, useUiPrefs } from '@/stores/ui';
import { useTimerHydrated, useTimerStore } from '@/stores/timer';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { CaptureDrawer } from './CaptureDrawer';
import { CommandPalette } from './CommandPalette';
import { DialogHost } from './DialogHost';
import { ToastHost } from './ToastHost';
import { DomainForms } from './DomainForms';

const SEEDED_KEY = 'clepso.timer.seeded';

/** The signed-in frame: sidebar, top bar, page, and the overlays every page can summon. */
export function AppFrame({ children }: { children: ReactNode }) {
  const collapsed = useUiPrefs((s) => s.sidebarCollapsed);
  const setCollapsed = useUiPrefs((s) => s.setSidebarCollapsed);
  const openPalette = useOverlays((s) => s.openPalette);
  const openCapture = useOverlays((s) => s.openCapture);
  const closeAll = useOverlays((s) => s.closeAll);
  const hydrated = useTimerHydrated();
  const startTimer = useTimerStore((s) => s.start);

  useEffect(() => {
    void useUiPrefs.persist.rehydrate();
    if (window.innerWidth <= 1100) setCollapsed(true);
  }, [setCollapsed]);

  // The fixtures open with a timer already running; seed it once per browser.
  useEffect(() => {
    if (!hydrated || dataMode !== 'mock') return;
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, '1');
    if (useTimerStore.getState().matterId === null) {
      startTimer(
        'm2',
        'Estate of Harold Bennett',
        'Draft inventory schedules',
        (42 * 60 + 17) * 1000,
      );
    }
  }, [hydrated, startTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'l' &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault();
        openCapture('Log time');
      }
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPalette, openCapture, closeAll]);

  return (
    <div
      className={['cl-shell', 'app-shell', collapsed && 'is-collapsed'].filter(Boolean).join(' ')}
      style={{ ['--size-sidebar' as string]: collapsed ? '68px' : '256px', minHeight: '100vh' }}
    >
      <a href="#main-content" className="app-skip-link">
        Skip to content
      </a>
      <AppSidebar />
      <main
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <AppTopBar />
        <div id="main-content" tabIndex={-1} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {children}
        </div>
        <ToastHost />
      </main>
      <CaptureDrawer />
      <CommandPalette />
      <DialogHost />
      <DomainForms />
    </div>
  );
}
