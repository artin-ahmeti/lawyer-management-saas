import { cn } from '@/lib/cn';

/** Small section eyebrow: an index in mono and a label in the system overline. */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('flex items-center gap-3 text-ink-2', className)}>
      {index ? <span className="text-mono-id text-accent">{index}</span> : null}
      {index ? <span aria-hidden="true" className="h-px w-8 bg-line" /> : null}
      <span className="text-overline">{children}</span>
    </p>
  );
}
