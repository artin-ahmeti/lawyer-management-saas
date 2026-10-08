import { cn } from '@/lib/cn';

/**
 * Chrome for every product demonstration: a quiet window with the fixed
 * "Interactive preview · sample data" label, so no demo can pass for real data.
 */
export function PreviewFrame({
  title,
  label = 'Interactive preview · sample data',
  children,
  className,
  toolbar,
}: {
  title: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'preview-frame overflow-hidden rounded-xl border border-hairline bg-surface shadow-lg',
        className,
      )}
    >
      <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-4 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
        </span>
        <div className="min-w-0 flex-1 truncate text-label text-ink-2">{title}</div>
        {toolbar}
        <span className="text-caption text-ink-3">{label}</span>
      </div>
      {children}
    </div>
  );
}
