import { formatCents } from '@lawfirm/core';
import { Text, type TextProps } from './Text';

export interface AmountProps extends Omit<TextProps, 'children' | 'variant'> {
  /** Integer cents (the app's money convention). */
  cents?: number;
  /** Or a preformatted string such as "1.6h". */
  value?: string;
  size?: 'md' | 'lg' | 'display';
  /** Dim the cents (default for money). */
  dimCents?: boolean;
}

/** Money and hours as first-class type: tabular, 600 weight, cents in ink-secondary. */
export function Amount({ cents, value, size = 'md', dimCents = true, tone, ...rest }: AmountProps) {
  const text = cents !== undefined ? formatCents(cents) : (value ?? '');
  const m = dimCents ? /^(.*?)(\.\d{2})$/.exec(text) : null;
  const variant = size === 'md' ? 'amount' : size === 'lg' ? 'amount-lg' : 'display';
  return (
    <Text variant={variant} tone={tone} tabular {...rest}>
      {m ? (
        <>
          {m[1]}
          <Text variant={variant} tone={tone === 'default' || !tone ? 'muted' : tone} weight="medium" tabular>
            {m[2]}
          </Text>
        </>
      ) : (
        text
      )}
    </Text>
  );
}

/** Identifiers in Geist Mono: matter numbers, invoice numbers, UTBMS codes, account suffixes. */
export function Mono({ ink, children, ...rest }: Omit<TextProps, 'variant'> & { ink?: boolean }) {
  return (
    <Text variant="mono-id" tone={ink ? 'default' : 'muted'} tabular {...rest}>
      {children}
    </Text>
  );
}
