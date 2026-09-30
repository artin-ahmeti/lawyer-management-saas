export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_COOKIE = 'clepso-theme';

/** Parse the persisted preference; anything else means "follow the system". */
export function readThemeCookie(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
