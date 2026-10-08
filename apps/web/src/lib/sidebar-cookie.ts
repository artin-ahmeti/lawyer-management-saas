export const SIDEBAR_COOKIE = 'clepso-sidebar';

/**
 * Parse the persisted sidebar preference. `null` means the user never chose,
 * so the layout falls back to the viewport default (collapsed at ≤1100px).
 */
export function readSidebarCookie(value: string | undefined): boolean | null {
  if (value === 'collapsed') return true;
  if (value === 'expanded') return false;
  return null;
}
