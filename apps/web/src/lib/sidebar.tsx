'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { SIDEBAR_COOKIE } from './sidebar-cookie';

interface SidebarContextValue {
  /** Resolved state (for aria and behaviour). */
  collapsed: boolean;
  /** `auto` = no explicit choice; CSS applies the viewport default so first paint is correct. */
  mode: 'collapsed' | 'expanded' | 'auto';
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const NARROW = '(max-width: 1100px)';
const subscribeNarrow = (onChange: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const isNarrow = () => window.matchMedia(NARROW).matches;

/**
 * Sidebar collapsed/expanded. An explicit choice lives in a cookie so the
 * server renders the right width on first paint (no expand-then-collapse on
 * load). Without a choice the sidebar follows the viewport: collapsed at
 * ≤1100px, expanded above.
 */
export function SidebarProvider({
  initial,
  children,
}: {
  /** Parsed cookie value; `null` when the user has never toggled. */
  initial: boolean | null;
  children: ReactNode;
}) {
  const [preference, setPreference] = useState<boolean | null>(initial);
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const collapsed = preference ?? narrow;

  const setCollapsed = useCallback((next: boolean) => {
    setPreference(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      mode: preference === null ? 'auto' : preference ? 'collapsed' : 'expanded',
      setCollapsed,
      toggle: () => setCollapsed(!collapsed),
    }),
    [collapsed, preference, setCollapsed],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar outside SidebarProvider');
  return ctx;
}
