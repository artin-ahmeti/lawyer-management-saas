import type { SVGProps } from 'react';
import { cx } from '../cx';
import { ICONS, type IconName } from '../icons';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'fill'> {
  /** Icon from the Clepso set (50 stroke icons drawn to the same spec as Phosphor Regular). */
  name: IconName;
  /** xs 14 · sm 16 · md 20 (default) · lg 24 (tab bars) · xl 28. */
  size?: IconSize;
  /** Fill instead of stroke (active tab). */
  filled?: boolean;
}

/**
 * Stroke icon at 1.75px, coloured by `currentColor`. Use `size="sm"` inline
 * with text, `md` in buttons and rows, `lg` in the tab bar. Wrap in
 * `IconWell` when the icon leads a row.
 */
export function Icon({ name, size = 'md', filled, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cx('cl-ic', size !== 'md' && `cl-ic--${size}`, filled && 'cl-ic--fill', className)}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
      {...rest}
    />
  );
}

export type IconWellTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface IconWellProps {
  name: IconName;
  /** Tonal background. `accent` for the three time actions in Capture, status tones for banners and timelines. */
  tone?: IconWellTone;
  /** 36px (default) or 44px (Capture sheet). */
  size?: 'md' | 'lg';
  round?: boolean;
  className?: string;
}

/** A 36px tonal square holding an icon; leads list rows, cards and the Capture grid. */
export function IconWell({ name, tone = 'neutral', size = 'md', round, className }: IconWellProps) {
  return (
    <span
      className={cx(
        'cl-ic-well',
        tone !== 'neutral' && `cl-ic-well--${tone}`,
        size === 'lg' && 'cl-ic-well--lg',
        round && 'cl-ic-well--round',
        className,
      )}
    >
      <Icon name={name} size={size === 'lg' ? 'lg' : 'md'} />
    </span>
  );
}
