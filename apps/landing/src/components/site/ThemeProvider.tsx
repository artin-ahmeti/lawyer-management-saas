'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { LANDING_THEME_COOKIE, LANDING_THEME_COLOR, type LandingTheme } from '@/config/theme';
import { Icon } from '../ui/Icon';

const ThemeContext = createContext<{
  theme: LandingTheme;
  toggle: () => void;
} | null>(null);

/** The server reads the same cookie: the first paint and hydration agree. */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: LandingTheme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState(initialTheme);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie = `${LANDING_THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', LANDING_THEME_COLOR[next]);
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', next);
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useLandingTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Landing theme controls require ThemeProvider.');
  return context;
}

export function ThemeToggle() {
  const { theme, toggle } = useLandingTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
