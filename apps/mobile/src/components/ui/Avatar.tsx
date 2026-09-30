import { View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const PX: Record<AvatarSize, number> = { xs: 24, sm: 28, md: 36, lg: 48, xl: 64 };
const FONT: Record<AvatarSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[15px]',
  xl: 'text-[20px]',
};

export interface AvatarProps {
  name?: string;
  initials?: string;
  size?: AvatarSize;
  /** People are round, organisations are squared. */
  kind?: 'person' | 'org';
  /** accent marks the signed-in user, ink marks a "+N" count. */
  tone?: 'default' | 'accent' | 'ink';
  icon?: IconName;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Initials on a tonal surface; xs 24 · sm 28 · md 36 · lg 48 · xl 64. */
export function Avatar({
  name,
  initials,
  size = 'md',
  kind = 'person',
  tone = 'default',
  icon,
  className,
}: AvatarProps) {
  const px = PX[size];
  const radius = kind === 'org' ? (px <= 28 ? 6 : 8) : px / 2;
  return (
    <View
      className={cn(
        'items-center justify-center border',
        tone === 'accent'
          ? 'border-transparent bg-accent-tint'
          : tone === 'ink'
            ? 'border-transparent bg-ink'
            : 'border-hairline bg-surface-2',
        className,
      )}
      style={{ width: px, height: px, borderRadius: radius }}
    >
      {icon ? (
        <Icon
          name={icon}
          size={px >= 48 ? 'lg' : 'sm'}
          tone={tone === 'ink' ? 'ink-inverse' : tone === 'accent' ? 'accent-ink' : 'ink-2'}
        />
      ) : (
        <Text
          variant="label"
          weight="semibold"
          className={cn(
            FONT[size],
            'tracking-wide',
            tone === 'ink'
              ? 'text-ink-inverse'
              : tone === 'accent'
                ? 'text-accent-ink'
                : 'text-ink-2',
          )}
        >
          {initials ?? (name ? initialsOf(name) : '')}
        </Text>
      )}
    </View>
  );
}
