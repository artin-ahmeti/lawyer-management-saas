import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface ClepsoRootProps extends HTMLAttributes<HTMLDivElement> {
  /** Force a theme for this subtree; omit to follow the system setting. */
  theme?: 'light' | 'dark';
  /** `web` switches to desktop density (36px controls, 44px rows, 14px body). Default is mobile density. */
  density?: 'mobile' | 'web';
  children?: ReactNode;
}

/**
 * Root wrapper for every Clepso screen. Applies the base font, ink and canvas
 * background, and scopes the theme (`light` / `dark` courthouse mode) and the
 * density (`mobile` / `web`) for everything inside. Components rendered
 * outside a ClepsoRoot still get their own styles but inherit the host page's
 * font and background.
 */
export function ClepsoRoot({
  theme,
  density = 'mobile',
  className,
  children,
  ...rest
}: ClepsoRootProps) {
  return (
    <div
      className={cx(
        'cl',
        theme === 'dark' && 'cl-theme-dark',
        theme === 'light' && 'cl-theme-light',
        density === 'web' && 'cl-web',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
