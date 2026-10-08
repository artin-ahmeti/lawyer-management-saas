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
    <p className={cn('section-label', className)}>
      {index ? <span aria-hidden="true" className="section-label-dot" /> : null}
      <span>{children}</span>
    </p>
  );
}
