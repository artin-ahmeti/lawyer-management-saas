import { cn } from '@/lib/cn';

/** Shared button styles: one family, three weights, physically stable (no scale on press). */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'md' | 'lg';

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(
    'mk-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[-0.005em]',
    'transition-[background-color,border-color,color] duration-[180ms] ease-[var(--ease-standard)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
    size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-11 px-4 text-[15px]',
    variant === 'primary' &&
      'bg-cobalt text-on-cobalt hover:bg-cobalt-hover active:bg-cobalt-pressed',
    variant === 'secondary' &&
      'border border-line bg-transparent text-ink hover:border-line-strong hover:bg-surface',
    variant === 'quiet' && 'px-2 text-ink-2 hover:text-ink',
    extra,
  );
}
