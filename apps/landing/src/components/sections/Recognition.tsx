import { EMAIL, MATTER, PEOPLE, REQUESTED_DATE } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Reveal } from '../ui/Reveal';
import { Icon, type IconName } from '../ui/Icon';
import { SectionLabel } from '../ui/SectionLabel';
import { VesselGlyph } from '../ui/VesselGlyph';

/** Third-party research, quoted with its source. Not Clepso data. */
const RESEARCH = [
  {
    figure: '3.0 of 8',
    unit: 'hours',
    text: 'billed by the average lawyer in a working day. The rest goes to administration, finding clients and communication.',
    source: 'Clio Legal Trends Report, 2025',
    href: 'https://www.clio.com/resources/legal-trends/read-online/',
  },
  {
    figure: '40%',
    unit: '',
    text: 'of law-firm lawyers call their time-tracking process inefficient.',
    source: 'Bloomberg Law, Attorney Workload and Hours Survey, 2024',
    href: 'https://assets.bbhub.io/bna/sites/18/2025/03/Attorney_Workload-Hours_032425.pdf',
  },
  {
    figure: '36',
    unit: 'days',
    text: 'is how long a solo firm’s work typically sits before it is billed (median).',
    source: 'Clio, Legal Trends for Solo and Small Law Firms, 2024',
    href: 'https://www.clio.com/wp-content/uploads/2024/04/Legal-Trends-for-Solo-and-Small-Law-Firms-2024.pdf',
  },
] as const;

function Num({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border border-line text-[11px] font-semibold text-ink-2 tabular',
        className,
      )}
    >
      {n}
    </span>
  );
}

function Artefact({
  n,
  icon,
  kind,
  className,
  children,
}: {
  n: number;
  icon: IconName;
  kind: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={cn('rounded-lg border border-hairline bg-surface p-4 shadow-md', className)}>
      <div className="mb-2.5 flex items-center gap-2 text-caption text-ink-3">
        <Num n={n} />
        <Icon name={icon} size={14} />
        <span className="text-overline">{kind}</span>
      </div>
      {children}
    </li>
  );
}

const AFTER: { n: number; icon: IconName; label: string; title: string; meta: string }[] = [
  {
    n: 1,
    icon: 'message',
    label: 'Communication',
    title: 'Dana’s email, filed to the matter',
    meta: 'Wed, Sep 30 · 09:14',
  },
  {
    n: 2,
    icon: 'file',
    label: 'Documents',
    title: 'MSA v3 marked latest',
    meta: 'v1 and v2 kept in the history',
  },
  {
    n: 3,
    icon: 'calendar',
    label: 'Next step',
    title: 'Review indemnity and liability cap',
    meta: `${PEOPLE.priya.name} · requested ${REQUESTED_DATE}, from the email`,
  },
  {
    n: 4,
    icon: 'clock',
    label: 'Time',
    title: '1.1h call and markup',
    meta: 'Drafted as a time entry to review',
  },
];

export function Recognition() {
  return (
    <section aria-labelledby="recognition-title" className="section-y relative">
      <div className="container-mk">
        <div className="grid grid-cols-12 gap-x-6 gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <SectionLabel index="01">The work around the work</SectionLabel>
            <h2 id="recognition-title" className="text-h2 mt-6 text-ink">
              <span className="block">The work is complex.</span>
              <span className="block text-ink-2">Finding it shouldn’t be.</span>
            </h2>
          </div>
          <p className="text-lede col-span-12 self-end text-ink-2 lg:col-span-4 lg:col-start-9">
            Finding the latest version. Chasing the next update. Rebuilding yesterday’s time. Bring
            the pieces of the matter back together.
          </p>
        </div>

        {/* Before → through the form → after. Understandable as a still image. */}
        <div className="mt-16 grid grid-cols-12 items-center gap-x-6 gap-y-10 lg:mt-24">
          <Reveal className="col-span-12 lg:col-span-5">
            <p className="mb-4 flex items-center gap-2 text-overline text-ink-3">
              <span aria-hidden="true" className="h-px w-6 bg-line" /> Before · scattered
            </p>
            <ul className="grid gap-3 sm:grid-cols-2" aria-label="Scattered pieces of one matter">
              <Artefact n={1} icon="message" kind="Client email" className="sm:-rotate-[1.2deg]">
                <p className="text-label text-ink">{EMAIL.subject}</p>
                <p className="mt-1 text-body-sm text-ink-2">
                  “Could you review and send us your comments by{' '}
                  <span className="text-ink underline decoration-accent/60 decoration-dotted underline-offset-4">
                    Friday 9 October
                  </span>
                  ?”
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-3">
                  <Icon name="paperclip" size={13} /> {EMAIL.attachment}
                </p>
              </Artefact>
              <Artefact
                n={2}
                icon="file"
                kind="Revised agreement"
                className="sm:translate-y-6 sm:rotate-[1deg]"
              >
                <ul className="grid gap-1.5 text-body-sm">
                  <li className="text-ink-3 line-through decoration-ink-3/60">MSA_v3.docx</li>
                  <li className="text-ink-3 line-through decoration-ink-3/60">
                    MSA_v3 (final).docx
                  </li>
                  <li className="text-ink">MSA_v3 (final) (2).docx</li>
                </ul>
                <p className="mt-2 text-caption text-ink-3">Which one is current?</p>
              </Artefact>
              <Artefact n={3} icon="calendar" kind="Requested date" className="sm:rotate-[0.8deg]">
                <p className="text-label text-ink">Friday 9 October</p>
                <p className="mt-1 text-body-sm text-ink-2">
                  Mentioned in an email. Not on anyone’s list yet.
                </p>
              </Artefact>
              <Artefact
                n={4}
                icon="clock"
                kind="Unrecorded work"
                className="sm:translate-y-6 sm:-rotate-[1deg]"
              >
                <p className="text-label text-ink">Call with Dana · 40 min</p>
                <p className="mt-1 text-body-sm text-ink-2">
                  Not recorded. To be rebuilt from memory on Friday.
                </p>
              </Artefact>
            </ul>
          </Reveal>

          <div aria-hidden="true" className="col-span-12 flex justify-center lg:col-span-2">
            <VesselGlyph className="h-28 w-14 text-line-strong lg:h-56 lg:w-24" />
          </div>

          <Reveal className="col-span-12 lg:col-span-5" delay={0.12}>
            <p className="mb-4 flex items-center gap-2 text-overline text-ink-3">
              <span aria-hidden="true" className="h-px w-6 bg-accent" /> After · one matter
            </p>
            <div className="rounded-xl border border-hairline bg-surface shadow-lg">
              <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-5 py-4">
                <div className="min-w-0">
                  <p className="text-mono-id text-accent">{MATTER.id}</p>
                  <p className="text-title-3 mt-0.5 text-ink">{MATTER.title}</p>
                </div>
                <p className="shrink-0 text-caption text-ink-3">{MATTER.client}</p>
              </div>
              <ul className="divide-y divide-hairline" aria-label={`Organised on ${MATTER.id}`}>
                {AFTER.map((row) => (
                  <li key={row.n} className="flex items-center gap-4 px-5 py-3.5">
                    <Num n={row.n} className="border-accent/50 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-overline text-ink-3">{row.label}</p>
                      <p className="text-body-sm text-ink sm:truncate">{row.title}</p>
                      <p className="text-caption text-ink-3 sm:truncate">{row.meta}</p>
                    </div>
                    <Icon name={row.icon} size={18} className="text-ink-3" />
                  </li>
                ))}
              </ul>
              <p className="border-t border-hairline px-5 py-3 text-caption text-ink-3">
                Sample data
              </p>
            </div>
          </Reveal>
        </div>

        {/* Research, credited. */}
        <div className="mt-24 border-t border-hairline pt-10 lg:mt-32">
          <p className="text-overline text-ink-3">
            What the research says · third-party figures, not Clepso data
          </p>
          <ul className="mt-8 grid gap-x-6 gap-y-10 md:grid-cols-3">
            {RESEARCH.map((r) => (
              <li key={r.source}>
                <p>
                  <span className="text-[clamp(2.5rem,1.6rem+2.4vw,3.5rem)] font-[560] leading-none tracking-[-0.04em] text-ink tabular">
                    {r.figure}
                  </span>
                  {r.unit ? <span className="ml-2 text-title-3 text-ink-2">{r.unit}</span> : null}
                </p>
                <p className="mt-4 max-w-[34ch] text-body text-ink-2">{r.text}</p>
                <p className="mt-3 text-caption text-ink-3">
                  Source:{' '}
                  <a
                    href={r.href}
                    className="underline decoration-line underline-offset-4 hover:text-ink-2"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {r.source}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
