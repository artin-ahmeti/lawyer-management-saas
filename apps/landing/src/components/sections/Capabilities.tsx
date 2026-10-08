import { statusOf, type FeatureKey, FEATURES } from '@/config/features';
import { DOCUMENT_VERSIONS, MATTER, PEOPLE, REQUESTED_DATE } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Reveal } from '../ui/Reveal';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusBadge } from '../ui/StatusBadge';

const detail = 'rounded-lg border border-hairline bg-surface p-4 shadow-sm';

const ROWS: { feature: FeatureKey; outcome: string; detail: React.ReactNode }[] = [
  {
    feature: 'matters',
    outcome:
      'Each matter holds its client, the other side, the people working on it and its stage. New parties are checked against every matter before work starts.',
    detail: (
      <div className={detail}>
        <p className="text-overline text-ink-3">Conflict check · {MATTER.opened}</p>
        <ul className="mt-3 grid gap-2 text-body-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-ink">{MATTER.client}</span>
            <span className="text-caption text-ink-3">Client</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-ink">{MATTER.counterparty}</span>
            <span className="text-caption text-ink-3">Other side</span>
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 border-t border-hairline pt-3 text-caption text-success-ink">
          <Icon name="check" size={13} /> No conflicts found · checked by {PEOPLE.jordan.name}
        </p>
      </div>
    ),
  },
  {
    feature: 'tasks',
    outcome:
      'Every task has an owner. Every date says where it came from: a client’s request, your own target, or a rule someone entered and a colleague checked.',
    detail: (
      <div className={cn(detail, 'grid gap-3')}>
        <div className="flex items-start gap-3">
          <Avatar person="priya" size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm text-ink">Review indemnity and liability cap</p>
            <p className="text-caption text-warning-ink">
              Requested {REQUESTED_DATE} · from client email
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 border-t border-hairline pt-3">
          <Avatar person="jordan" size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm text-ink">Update the clause comparison</p>
            <p className="text-caption text-ink-3">Internal target · Wed, Oct 7</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    feature: 'documents',
    outcome:
      'One latest version, with the history kept. See which clauses changed between drafts before you open a file.',
    detail: (
      <div className={detail}>
        <ol className="grid gap-2" aria-label="Versions of the agreement">
          {DOCUMENT_VERSIONS.map((v) => (
            <li
              key={v.version}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-body-sm',
                v.latest ? 'bg-accent-tint/50 text-ink' : 'text-ink-2',
              )}
            >
              <span className={cn('text-mono-id', v.latest ? 'text-accent' : 'text-ink-3')}>
                {v.version}
              </span>
              <span className="min-w-0 flex-1 truncate">{v.note}</span>
              <span className="text-caption text-ink-3">{v.date.split(' · ')[0]}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-caption text-ink-2">Changed in v3: 9.2 · 10.1 · 14.1</p>
      </div>
    ),
  },
  {
    feature: 'communication',
    outcome:
      'Client updates in plain language that name the next step and its date, drafted from the matter and sent only after you approve them.',
    detail: (
      <div className={detail}>
        <p className="text-caption text-ink-3">To {PEOPLE.dana.name} · draft</p>
        <p className="mt-2 rounded-md border border-hairline bg-canvas/60 px-3 py-2.5 text-body-sm text-ink-2">
          “Next: we will send you our comments by Friday, October 9. Nothing is needed from you
          before then.”
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-caption text-accent-ink">
          <Icon name="pen" size={13} /> Waiting for your approval
        </p>
      </div>
    ),
  },
  {
    feature: 'timeBilling',
    outcome:
      'Capture time when the work happens, from a timer, a voice note or the day’s activity, and review it before it reaches an invoice.',
    detail: (
      <div className={cn(detail, 'grid gap-3')}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-body-sm text-ink">Call and markup, MSA v3</p>
          <p className="text-title-3 text-ink tabular">1.1h</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3 text-caption">
          <span className="text-ink-3">{MATTER.id} · billable</span>
          <span className="text-accent-ink">To review</span>
        </div>
      </div>
    ),
  },
];

export function Capabilities() {
  return (
    <section aria-labelledby="caps-title" className="section-y relative bg-deep">
      <div className="container-mk">
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 lg:col-span-8">
            <SectionLabel index="04">The workspace</SectionLabel>
            <h2 id="caps-title" className="text-h2 mt-6 text-ink">
              <span className="block">Built around the work.</span>
              <span className="block text-ink-2">Not another workaround.</span>
            </h2>
          </div>
          <p className="text-lede col-span-12 self-end text-ink-2 lg:col-span-4">
            Five parts of the practice that usually live in five places. In Clepso they share one
            matter.
          </p>
        </div>

        <ol className="mt-16 border-t border-hairline lg:mt-20">
          {ROWS.map((row, i) => (
            <Reveal
              as="li"
              key={row.feature}
              className="grid grid-cols-12 gap-x-6 gap-y-5 border-b border-hairline py-10 lg:py-12"
            >
              <div className="col-span-12 md:col-span-6 lg:col-span-4">
                <p className="text-mono-id text-ink-3">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="text-h3 mt-3 text-ink">{FEATURES[row.feature].name}</h3>
                <StatusBadge status={statusOf(row.feature)} className="mt-3" />
              </div>
              <p className="col-span-12 max-w-[42ch] text-body text-ink-2 md:col-span-6 lg:col-span-4">
                {row.outcome}
              </p>
              <div
                className={cn(
                  'col-span-12 md:col-span-8 md:col-start-5 lg:col-span-4 lg:col-start-auto',
                  i % 2 === 1 && 'lg:translate-y-4',
                )}
              >
                {row.detail}
              </div>
            </Reveal>
          ))}
        </ol>
        <p className="mt-8 text-caption text-ink-3">
          Examples use sample data from one fictional matter.
        </p>
      </div>
    </section>
  );
}
