import { PEOPLE, type PersonKey } from '@/content/sample-matter';
import { cn } from '@/lib/cn';

export function Avatar({
  person,
  size = 24,
  className,
}: {
  person: PersonKey;
  size?: number;
  className?: string;
}) {
  const p = PEOPLE[person];
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full border border-line bg-raised font-semibold text-ink-2 tabular',
        className,
      )}
    >
      {p.initials}
    </span>
  );
}
