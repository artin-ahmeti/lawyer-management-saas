import { statusOf, type FeatureKey, FEATURES } from '@/config/features';
import { DOCUMENT_VERSIONS, MATTER, PEOPLE, REQUESTED_DATE } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';
import { Reveal } from '../ui/Reveal';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusBadge } from '../ui/StatusBadge';

const detail = '';

const ROWS: { feature: FeatureKey; outcome: string; detail: React.ReactNode }[] = [
  {
    feature: 'matters',
    outcome:
      'The people, parties and progress of every matter, together. Check new parties against existing matters before work starts.',
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
      'Clear owners. Visible next steps. Dates that show their source, from a client’s request to your firm’s internal target.',
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
      'Clear updates, drafted from the matter. The next step and its date, sent only after your approval.',
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
      'Capture work while it’s fresh, with a timer, voice note or matter activity. Review each entry before invoicing.',
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

const ICONS: IconName[] = ['folder', 'calendar', 'file', 'message', 'clock'];

export function Capabilities() {
  return (
    <section aria-labelledby="caps-title" className="section-y capabilities-section">
      <div className="container-mk">
        <div className="section-heading">
          <SectionLabel index="04">Made for the whole practice</SectionLabel>
          <h2 id="caps-title" className="text-h2 text-ink">
            Less switching.
            <br />
            <span className="heading-accent">More moving forward.</span>
          </h2>
          <p className="text-lede text-ink-2">
            Five parts of your practice. One connected matter. A workspace that keeps the context
            with the work.
          </p>
        </div>
        <ol className="capability-grid">
          {ROWS.map((row, i) => (
            <Reveal as="li" key={row.feature} className="capability-card">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="capability-icon">
                    <Icon name={ICONS[i]!} size={20} />
                  </span>
                  <StatusBadge status={statusOf(row.feature)} />
                </div>
                <h3 className="mt-5 text-h3 text-ink">{FEATURES[row.feature].name}</h3>
                <p className="mt-3 text-body text-ink-2">{row.outcome}</p>
              </div>
              <div className="capability-detail">{row.detail}</div>
            </Reveal>
          ))}
        </ol>
        <p className="mt-6 text-center text-caption text-ink-3">
          Examples use sample data from one fictional matter.
        </p>
      </div>
    </section>
  );
}
