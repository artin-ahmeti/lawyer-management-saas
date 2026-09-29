import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type TypeStyle, type ThemeName, type themes, type as typeScale } from '@lawfirm/ui';
import { cn } from './cn';

export type TextTone =
  | 'default'
  | 'muted'
  | 'faint'
  | 'inverse'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'disabled';

const TONE: Record<TextTone, string> = {
  default: 'text-ink',
  muted: 'text-ink-2',
  faint: 'text-ink-3',
  inverse: 'text-ink-inverse',
  accent: 'text-accent',
  onAccent: 'text-on-accent',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
  disabled: 'text-ink-disabled',
};

type Family = 'sans' | 'sans-medium' | 'sans-semibold' | 'mono' | 'mono-medium';
const FAMILY: Record<Family, string> = {
  sans: 'font-sans',
  'sans-medium': 'font-sans-medium',
  'sans-semibold': 'font-sans-semibold',
  mono: 'font-mono',
  'mono-medium': 'font-mono-medium',
};

export type TextWeight = 'regular' | 'medium' | 'semibold';

export interface TextProps extends RNTextProps {
  /** One of the 14 type styles; size, line height, tracking and family come from the token. */
  variant?: TypeStyle;
  tone?: TextTone;
  /** Override the token's weight (family swap; weight is never synthesised). */
  weight?: TextWeight;
  /** Tabular figures for columns of numbers. */
  tabular?: boolean;
  className?: string;
}

function familyFor(base: Family, weight?: TextWeight): Family {
  if (!weight) return base;
  const mono = base.startsWith('mono');
  if (mono) return weight === 'regular' ? 'mono' : 'mono-medium';
  return weight === 'regular' ? 'sans' : weight === 'medium' ? 'sans-medium' : 'sans-semibold';
}

/**
 * Typography primitive. Hierarchy comes from `variant` (size + weight),
 * colour only from `tone`. Numbers that line up pass `tabular`.
 */
export function Text({ variant = 'body', tone = 'default', weight, tabular, className, style, ...rest }: TextProps) {
  const t = typeScale[variant];
  return (
    <RNText
      className={cn(`text-${variant}`, FAMILY[familyFor(t.family, weight)], TONE[tone], className)}
      style={[tabular ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}

export type { ThemeName, themes };
