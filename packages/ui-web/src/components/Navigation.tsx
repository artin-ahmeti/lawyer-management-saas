import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import { CaptureButton } from './Button';
import type { IconName } from '../icons';

export interface TabBarItem {
  key: string;
  label: ReactNode;
  icon: IconName;
}

export interface TabBarProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** Four destinations: Today, Matters, Calendar, Billing (the client app uses four without Capture). */
  items: TabBarItem[];
  activeKey: string;
  onSelect?: (key: string) => void;
  /** Render the centre Capture button between the second and third item. */
  capture?: boolean;
  onCapture?: () => void;
}

/** Mobile tab bar: Today · Matters · Capture · Calendar · Billing. The running TimerBar docks above it. */
export function TabBar({
  items,
  activeKey,
  onSelect,
  capture = true,
  onCapture,
  className,
  ...rest
}: TabBarProps) {
  const cols = items.length + (capture ? 1 : 0);
  const mid = Math.floor(items.length / 2);
  const slots: ReactNode[] = [];
  items.forEach((it, i) => {
    if (capture && i === mid) {
      slots.push(
        <span key="__capture" className="cl-tab cl-tab--capture">
          <CaptureButton onClick={onCapture} />
        </span>,
      );
    }
    slots.push(
      <button
        key={it.key}
        type="button"
        className={cx('cl-tab', it.key === activeKey && 'is-active')}
        onClick={() => onSelect?.(it.key)}
      >
        <Icon name={it.icon} />
        {it.label}
      </button>,
    );
  });
  return (
    <nav
      className={cx('cl-tabbar', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      {...rest}
    >
      {slots}
    </nav>
  );
}

export interface NavBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Back label in accent ("Matters"). */
  back?: ReactNode;
  onBack?: () => void;
  /** Centre title; use `mono` for identifiers. */
  title?: ReactNode;
  mono?: boolean;
  /** Plain icon buttons on the right. */
  actions?: ReactNode;
}

/** Compact mobile nav bar for detail screens: back label, mono identifier, plain icon actions. */
export function NavBar({ back, onBack, title, mono, actions, className, ...rest }: NavBarProps) {
  return (
    <div className={cx('cl-nav', className)} {...rest}>
      {back ? (
        <button type="button" className="cl-nav__back" onClick={onBack}>
          <Icon name="chevron-left" />
          {back}
        </button>
      ) : (
        <span />
      )}
      {title ? (
        <span className={cx('cl-nav__title', mono && 'cl-mono cl-mono--ink')}>{title}</span>
      ) : null}
      {actions ? <div className="cl-nav__actions">{actions}</div> : null}
    </div>
  );
}

export interface ScreenHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Small line above the title (the date on Today). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Round icon buttons and the avatar. */
  actions?: ReactNode;
}

/** Large-title header for root tabs (title-1) with an eyebrow and round icon actions. */
export function ScreenHeader({ eyebrow, title, actions, className, ...rest }: ScreenHeaderProps) {
  return (
    <div className={cx('cl-header', className)} {...rest}>
      <div>
        {eyebrow ? <div className="cl-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="cl-h1">{title}</h1>
      </div>
      {actions ? <div className="cl-header__actions">{actions}</div> : null}
    </div>
  );
}

export interface NavItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  label: ReactNode;
  active?: boolean;
  /** Tabular count on the right. */
  count?: number | string;
  /** Accent badge instead of a plain count (Inbox). */
  badge?: boolean;
  /** Leading element instead of an icon (an Avatar). */
  lead?: ReactNode;
}

/** Sidebar navigation item. */
export function NavItem({
  icon,
  label,
  active,
  count,
  badge,
  lead,
  className,
  ...rest
}: NavItemProps) {
  return (
    <button type="button" className={cx('cl-navitem', active && 'is-active', className)} {...rest}>
      {lead ?? (icon ? <Icon name={icon} /> : null)}
      {label}
      {count !== undefined ? (
        <span className={cx('cl-navitem__count', badge && 'is-badge')}>{count}</span>
      ) : null}
    </button>
  );
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Firm name in the switcher. */
  firm: ReactNode;
  /** Mark shown before the firm name. */
  mark?: ReactNode;
  children?: ReactNode;
  /** Pinned to the bottom (Settings, the user). */
  footer?: ReactNode;
}

/** 256px web sidebar: firm switcher, then NavItems grouped with `SidebarGroup`, footer pinned. */
export function Sidebar({ firm, mark, footer, className, children, ...rest }: SidebarProps) {
  return (
    <aside className={cx('cl-sidebar', className)} {...rest}>
      <div className="cl-sidebar__firm">
        {mark ?? <BrandMark />}
        {firm}
        <Icon name="chevron-down" size="sm" />
      </div>
      {children}
      <div className="cl-sidebar__spacer" />
      {footer}
    </aside>
  );
}

export interface SidebarGroupProps {
  label: ReactNode;
}

/** Overline label between sidebar groups (Work, Money). */
export function SidebarGroup({ label }: SidebarGroupProps) {
  return <div className="cl-sidebar__group">{label}</div>;
}

export interface BrandMarkProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'md' | 'lg';
  tone?: 'ink' | 'accent';
}

/** The Clepso placeholder mark: a tile with a "C" arc. */
export function BrandMark({ size = 'md', tone = 'ink', className, ...rest }: BrandMarkProps) {
  return (
    <span
      className={cx(
        'cl-mark',
        size === 'lg' && 'cl-mark--lg',
        tone === 'accent' && 'cl-mark--accent',
        className,
      )}
      {...rest}
    >
      <Icon name="mark" />
    </span>
  );
}

export interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/** The Clepso wordmark in Geist, −0.03em. */
export function Wordmark({ className, children = 'Clepso', ...rest }: WordmarkProps) {
  return (
    <span className={cx('cl-wordmark', className)} {...rest}>
      {children}
    </span>
  );
}

export interface TopBarProps extends HTMLAttributes<HTMLDivElement> {
  searchPlaceholder?: ReactNode;
  /** Running timer widget. */
  timer?: {
    title: ReactNode;
    time: ReactNode;
    paused?: boolean;
    onPause?: () => void;
    onStop?: () => void;
    onResume?: () => void;
  };
  /** Right cluster after the timer: buttons, alerts, avatar. */
  right?: ReactNode;
  onToggleSidebar?: () => void;
}

/** 56px web top bar: sidebar toggle, ⌘K search, running timer, and the right cluster. */
export function TopBar({
  searchPlaceholder = 'Search or jump to…',
  timer,
  right,
  onToggleSidebar,
  className,
  ...rest
}: TopBarProps) {
  return (
    <div className={cx('cl-topbar', className)} {...rest}>
      <button
        type="button"
        className="cl-iconbtn cl-iconbtn--plain cl-iconbtn--sm"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
      >
        <Icon name="panel" />
      </button>
      <div className="cl-topbar__search">
        <Icon name="search" size="sm" />
        {searchPlaceholder}
        <span className="cl-kbd">⌘K</span>
      </div>
      <div className="cl-topbar__right">
        {timer ? (
          <div className="cl-topbar__timer">
            <span
              className={cx('cl-timerbar__dot')}
              style={
                timer.paused ? { animation: 'none', background: 'var(--warning-dot)' } : undefined
              }
            />
            <span className="title">{timer.title}</span>
            <span className="time">{timer.time}</span>
            {timer.paused ? (
              <button
                type="button"
                className="cl-iconbtn"
                aria-label="Resume"
                onClick={timer.onResume}
              >
                <Icon name="play" size="sm" />
              </button>
            ) : (
              <button
                type="button"
                className="cl-iconbtn"
                aria-label="Pause"
                onClick={timer.onPause}
              >
                <Icon name="pause" size="sm" />
              </button>
            )}
            <button type="button" className="cl-iconbtn" aria-label="Stop" onClick={timer.onStop}>
              <Icon name="stop" size="sm" />
            </button>
          </div>
        ) : null}
        {right}
      </div>
    </div>
  );
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLDivElement> {
  /** The last item is bold; pass a `Mono` element for identifiers. */
  items: ReactNode[];
}

/** Breadcrumb trail for web page headers. */
export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  return (
    <div className={cx('cl-crumbs', className)} {...rest}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 ? <Icon name="chevron-right" /> : null}
          {i === items.length - 1 ? <b>{it}</b> : it}
        </span>
      ))}
    </div>
  );
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  crumbs?: ReactNode[];
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Display-size greeting style ("Good morning, Dana."). */
  greeting?: boolean;
  /** Pills and metadata under the title. */
  meta?: ReactNode;
  actions?: ReactNode;
  /** In-page tabs (a SegmentedControl) under the header. */
  tabs?: ReactNode;
}

/** Web page header: breadcrumbs, title, metadata, actions, in-page tabs. */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  greeting,
  meta,
  actions,
  tabs,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <div className={className} {...rest}>
      {crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}
      <div className="cl-pagehead" style={crumbs?.length ? { marginTop: 10 } : undefined}>
        <div>
          {eyebrow ? <div className="cl-pagehead__eyebrow">{eyebrow}</div> : null}
          <h1 className={cx(greeting && 'cl-h1--greeting')}>{title}</h1>
          {meta ? (
            <div className="cl-inline" style={{ marginTop: 8 }}>
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="cl-pagehead__actions">{actions}</div> : null}
      </div>
      {tabs ? <div style={{ marginTop: 18 }}>{tabs}</div> : null}
    </div>
  );
}

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  sidebar: ReactNode;
  topbar?: ReactNode;
  /** Right-hand detail drawer. */
  drawer?: ReactNode;
  children?: ReactNode;
}

/** Web application frame: sidebar on the left, top bar, main content with 24/32px padding, optional drawer. Render inside `ClepsoRoot density="web"`. */
export function AppShell({ sidebar, topbar, drawer, className, children, ...rest }: AppShellProps) {
  return (
    <div className={cx('cl-shell', className)} {...rest}>
      {sidebar}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {topbar}
        {drawer ? (
          <div className="cl-cols cl-cols--sidebar" style={{ gap: 0, flex: 1, minHeight: 0 }}>
            <div className="cl-main">{children}</div>
            {drawer}
          </div>
        ) : (
          <div className="cl-main">{children}</div>
        )}
      </main>
    </div>
  );
}

export interface DrawerProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** Right-hand detail drawer (380px) beside a table. */
export function Drawer({ className, children, ...rest }: DrawerProps) {
  return (
    <aside className={cx('cl-drawer', className)} {...rest}>
      {children}
    </aside>
  );
}
