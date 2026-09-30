'use client';

import type { CSSProperties, ReactNode } from 'react';

export interface DrawerLayoutProps {
  /** Page header + toolbar (row 1). */
  header: ReactNode;
  /** Table or list (row 2, scrolls with the page). */
  children: ReactNode;
  /** Right-hand detail drawer; omit or pass null to collapse the column. */
  drawer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The web list-page frame: content on the left, a sticky 320–380px detail
 * drawer on the right that animates open when a row is selected (Matters,
 * Pre-bill). The drawer spans both rows so it sits flush under the top bar.
 */
export function DrawerLayout({ header, children, drawer, className, style }: DrawerLayoutProps) {
  const open = Boolean(drawer);
  return (
    <div
      className={['cl-main', 'app-enter', 'app-drawer-layout', className].filter(Boolean).join(' ')}
      style={{
        paddingRight: 0,
        paddingBottom: 0,
        display: 'grid',
        gridTemplateColumns: `minmax(0,1fr) ${open ? 'minmax(320px, 380px)' : '0px'}`,
        gridTemplateRows: 'auto minmax(0,1fr)',
        gap: '16px 0',
        transition: 'grid-template-columns 240ms var(--ease-standard)',
        ...style,
      }}
    >
      <div
        style={{
          gridColumn: 1,
          gridRow: 1,
          paddingRight: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 0,
        }}
      >
        {header}
      </div>
      <div
        style={{
          gridColumn: 1,
          gridRow: 2,
          paddingRight: 32,
          minHeight: 0,
          paddingBottom: 32,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {children}
      </div>
      {open ? (
        <aside
          className="cl-drawer app-slide-in"
          style={{
            gridColumn: 2,
            gridRow: '1 / span 2',
            marginTop: -24,
            position: 'sticky',
            top: 56,
            height: 'calc(100vh - 56px)',
            overflow: 'auto',
          }}
        >
          {drawer}
        </aside>
      ) : null}
    </div>
  );
}
