import { STATUS_COPY, type FeatureStatus } from '@/config/features';
import { cn } from '@/lib/cn';

/** Availability label. Always text, never colour alone; the dot is redundant to the word. */
export function StatusBadge({
  status,
  className,
  detail,
}: {
  status: FeatureStatus;
  className?: string;
  /** Optional extra words after the label, e.g. "sample data". */
  detail?: string;
}) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption whitespace-nowrap',
        status === 'available' && 'border-success-dot/40 text-success-ink',
        status === 'preview' && 'border-accent/35 text-accent-ink',
        status === 'planned' && 'border-line text-ink-2',
        className,
      )}
      title={copy.description}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          status === 'available' && 'bg-success-dot',
          status === 'preview' && 'bg-accent',
          status === 'planned' && 'border border-ink-3',
        )}
      />
      {copy.label}
      {detail ? <span className="text-ink-3">· {detail}</span> : null}
    </span>
  );
}
