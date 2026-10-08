import { MATTER, REQUESTED_DATE } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../ui/Icon';

const ROWS: { icon: IconName; title: string; meta: string }[] = [
  { icon: 'file', title: 'MSA v3 is the latest version', meta: 'Received Sep 30 · replaces v2' },
  {
    icon: 'calendar',
    title: 'Review indemnity and liability cap',
    meta: `Priya Shah · requested ${REQUESTED_DATE}`,
  },
  { icon: 'message', title: 'Client update drafted', meta: 'Waiting for your review' },
  { icon: 'clock', title: '1.1h call and markup', meta: 'Time entry to review' },
];

/** The ordered result of the hero sequence: one matter, four things in their place. */
export function MatterExcerpt({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        'seq-card rounded-lg border border-hairline bg-surface/95 p-1 shadow-lg backdrop-blur-sm',
        className,
      )}
      aria-label={`Sample matter ${MATTER.id}, ${MATTER.title}`}
    >
      <figcaption className="flex items-baseline justify-between gap-3 px-3 pb-2 pt-2.5">
        <span className="min-w-0">
          <span className="text-mono-id text-accent">{MATTER.id}</span>
          <span className="ml-2 text-label text-ink">{MATTER.title}</span>
        </span>
        <span className="shrink-0 text-caption text-ink-3">Sample</span>
      </figcaption>
      <ul className="divide-y divide-hairline rounded-md bg-canvas/60">
        {ROWS.map((row, i) => (
          <li
            key={row.title}
            className="seq-row flex items-center gap-3 px-3 py-2.5"
            style={{ ['--delay' as string]: `${2.7 + i * 0.16}s` }}
          >
            <span className="grid size-8 place-items-center rounded-md border border-hairline bg-surface text-ink-2">
              <Icon name={row.icon} size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-body-sm text-ink sm:truncate">{row.title}</span>
              <span className="block truncate text-caption text-ink-3">{row.meta}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="seq-settle flex items-center gap-2 px-3 pb-2 pt-2.5 text-caption text-ink-2">
        <Icon name="check" size={14} className="text-success-ink" />
        Filed to {MATTER.id} · waiting for your review
      </p>
    </figure>
  );
}
