'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { THEME_COOKIE as COOKIE, type ThemePreference } from './theme-cookie';

export type { ThemePreference };

interface ThemeContextValue {
  preference: ThemePreference;
  /** Resolved scheme after the system setting is applied. */
  scheme: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Theme = the `data-theme` attribute on <html>, which tokens.css scopes on.
 * The server renders the cookie value so there is no flash; the client keeps
 * the attribute, the cookie and the context in step. `dark` is courthouse mode.
 */
export function ThemeProvider({
  initial,
  children,
}: {
  initial: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPref] = useState<ThemePreference>(initial);
  const [system, setSystem] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystem(mq.matches ? 'dark' : 'light');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    const root = document.documentElement;
    if (p === 'system') delete root.dataset.theme;
    else root.dataset.theme = p;
    document.cookie = `${COOKIE}=${p}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const scheme = preference === 'system' ? system : preference;
  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      setPreference,
      toggle: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    }),
    [preference, scheme, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}

export { systemScheme };
