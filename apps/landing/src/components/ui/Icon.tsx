import { ICONS, type IconName as SystemIcon } from '@lawfirm/ui-web/icons';
import { cn } from '@/lib/cn';

/**
 * Icons: the Clepso set (Phosphor-style, 24px grid, stroke) from @lawfirm/ui-web,
 * plus three marketing-only glyphs drawn to the same grid and stroke.
 */
const EXTRA = {
  menu: '<path d="M4 8h16M4 16h16"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>',
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  paperclip:
    '<path d="m16.5 7.5-7.8 7.8a2 2 0 0 0 2.8 2.8l8-8a4 4 0 0 0-5.6-5.6l-8 8a6 6 0 0 0 8.5 8.5l6.6-6.6"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5M12 8v4.5l3 2"/>',
} as const;

export type IconName = SystemIcon | keyof typeof EXTRA;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const markup = name in EXTRA ? EXTRA[name as keyof typeof EXTRA] : ICONS[name as SystemIcon];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
