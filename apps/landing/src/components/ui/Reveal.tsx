import { cn } from '@/lib/cn';

/**
 * Scroll reveal as progressive enhancement: a CSS scroll-driven animation that
 * only moves the block into place (never from invisible). Browsers without
 * scroll timelines, and reduced-motion users, simply see the content.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  return (
    <Tag
      className={cn('reveal', className)}
      style={delay ? { ['--reveal-offset' as string]: `${Math.round(delay * 100)}%` } : undefined}
    >
      {children}
    </Tag>
  );
}
