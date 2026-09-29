import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface PhoneFrameProps extends HTMLAttributes<HTMLDivElement> {
  /** Status-bar clock. */
  time?: string;
  /** Screen body (scroll area, 20px gutters). */
  children?: ReactNode;
  /** Docked bottom: TimerBar + TabBar, or a footer button row. */
  bottom?: ReactNode;
  /** Courthouse mode for this phone only. */
  dark?: boolean;
  /** No side gutters (sheets that fill the screen). */
  flush?: boolean;
  /** Fade the bottom of the body to suggest scrolling. */
  fade?: boolean;
  /** Overlay (Scrim with a Sheet or Dialog). */
  overlay?: ReactNode;
  /** Background colour class for the home-indicator strip. */
  bottomSurface?: 'surface' | 'canvas' | 'raised';
}

/**
 * A 390×844 phone with status bar, Dynamic Island and home indicator, for
 * presenting mobile screens. Put the screen in `children`, the TabBar and
 * TimerBar in `bottom`, and a Scrim in `overlay`.
 */
export function PhoneFrame({
  time = '9:41',
  children,
  bottom,
  dark,
  flush,
  fade = true,
  overlay,
  bottomSurface = 'surface',
  className,
  ...rest
}: PhoneFrameProps) {
  const bg =
    bottomSurface === 'canvas'
      ? 'var(--bg)'
      : bottomSurface === 'raised'
        ? 'var(--surface-3)'
        : undefined;
  return (
    <div className={cx('cl-phone', dark && 'cl-theme-dark', className)} {...rest}>
      <div className="cl-phone__island" />
      <div className="cl-phone__status">
        <span>{time}</span>
        <span className="sig">
          <i />
        </span>
      </div>
      <div className={cx('cl-phone__body', flush && 'cl-phone__body--flush')}>
        {children}
        {fade ? <div className="cl-phone__fade" /> : null}
      </div>
      <div className="cl-phone__bottom">
        {bottom}
        <div className="cl-phone__home" style={bg ? { background: bg } : undefined} />
      </div>
      {overlay}
    </div>
  );
}

export interface BrowserFrameProps extends HTMLAttributes<HTMLDivElement> {
  url?: string;
  /** Viewport height in px (default 820). */
  height?: number;
  children?: ReactNode;
}

/** A 1280px browser window for presenting web pages; put an AppShell inside. */
export function BrowserFrame({
  url = 'app.clepso.com',
  height = 820,
  className,
  children,
  ...rest
}: BrowserFrameProps) {
  return (
    <div className={cx('cl-browser', 'cl-web', className)} {...rest}>
      <div className="cl-browser__chrome">
        <i />
        <i />
        <i />
        <div className="cl-browser__url">{url}</div>
      </div>
      <div className="cl-browser__view" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
