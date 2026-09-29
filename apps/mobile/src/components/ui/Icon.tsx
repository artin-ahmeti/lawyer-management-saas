import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import { cn } from './cn';
import { ICONS, type IconName } from './icons';
import type { ColorToken } from '@lawfirm/ui';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const SIZE: Record<IconSize, number> = { xs: 14, sm: 16, md: 20, lg: 24, xl: 28 };

export interface IconProps {
  name: IconName;
  /** xs 14 · sm 16 · md 20 (default) · lg 24 (tab bar) · xl 28. */
  size?: IconSize | number;
  /** Colour token; defaults to ink. */
  tone?: ColorToken;
  /** Explicit colour (overrides tone). */
  color?: string;
  /** Fill weight for the active tab. */
  filled?: boolean;
  bold?: boolean;
  className?: string;
}

/** Stroke icon from the Clepso set (Phosphor Regular), sized by role and coloured by token. */
export function Icon({ name, size = 'md', tone = 'ink', color, filled, bold, className }: IconProps) {
  const { theme } = useTheme();
  const px = typeof size === 'number' ? size : SIZE[size];
  const c = color ?? theme[tone];
  const Cmp = ICONS[name];
  return (
    <View className={className} style={{ width: px, height: px }}>
      <Cmp size={px} color={c} weight={filled ? 'fill' : bold ? 'bold' : 'regular'} />
    </View>
  );
}

export type IconWellTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
const WELL_BG: Record<IconWellTone, string> = {
  neutral: 'bg-surface-2',
  accent: 'bg-accent-tint',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
  info: 'bg-info-bg',
};
const WELL_INK: Record<IconWellTone, ColorToken> = {
  neutral: 'ink-2',
  accent: 'accent-ink',
  success: 'success-ink',
  warning: 'warning-ink',
  danger: 'danger-ink',
  info: 'info-ink',
};

export interface IconWellProps {
  name: IconName;
  tone?: IconWellTone;
  /** 36px (default) or 44px (Capture sheet). */
  size?: 'md' | 'lg';
  round?: boolean;
  className?: string;
}

/** A 36px tonal square holding an icon; leads rows, cards and the Capture grid. */
export function IconWell({ name, tone = 'neutral', size = 'md', round, className }: IconWellProps) {
  return (
    <View
      className={cn(
        'items-center justify-center',
        size === 'lg' ? 'h-11 w-11 rounded-[10px]' : 'h-9 w-9 rounded-md',
        round && 'rounded-full',
        WELL_BG[tone],
        className,
      )}
    >
      <Icon name={name} size={size === 'lg' ? 'lg' : 'md'} tone={WELL_INK[tone]} />
    </View>
  );
}

/** The Clepso placeholder mark: a tile with a "C" arc. */
export function BrandMark({ size = 'md', tone = 'ink' }: { size?: 'md' | 'lg'; tone?: 'ink' | 'accent' }) {
  const { theme } = useTheme();
  const px = size === 'lg' ? 48 : 32;
  const icon = size === 'lg' ? 26 : 18;
  return (
    <View
      className={cn('items-center justify-center', tone === 'accent' ? 'bg-accent' : 'bg-ink')}
      style={{ width: px, height: px, borderRadius: size === 'lg' ? 12 : 8 }}
    >
      <Svg width={icon} height={icon} viewBox="0 0 24 24">
        <Path
          d="M17 8.2A6.5 6.5 0 1 0 17 15.8"
          stroke={tone === 'accent' ? theme['on-accent'] : theme['ink-inverse']}
          strokeWidth={2.75}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
