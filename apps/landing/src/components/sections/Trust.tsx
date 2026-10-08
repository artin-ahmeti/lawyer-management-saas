import { statusOf } from '@/config/features';
import { MATTER, PEOPLE } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusBadge } from '../ui/StatusBadge';

const ACCESS = [
  { person: 'marcus' as const, access: 'Full access' },
  { person: 'priya' as const, access: 'Full access' },
  { person: 'jordan' as const, access: 'Documents and tasks' },
];

const RECORD: { time: string; who: string; text: string; icon: IconName; ai?: boolean }[] = [
  {
    time: '11:12',
    who: 'Clepso',
    text: 'Prepared a client-update draft from 3 sources',
    icon: 'pen',
    ai: true,
  },
  { time: '11:19', who: PEOPLE.priya.name, text: 'Edited two sentences', icon: 'pen' },
  { time: '11:21', who: PEOPLE.priya.name, text: 'Approved the draft', icon: 'check' },
  { time: '11:24', who: PEOPLE.priya.name, text: 'Sent it to Dana Whitfield', icon: 'send' },
];

const PRINCIPLES = [
  {
    title: 'People approve what leaves the firm',
    text: 'Drafts, replies and updates wait for a person. Nothing is sent to a client on its own.',
  },
  {
    title: 'Every suggestion shows its sources',
    text: 'Summaries point to the email or clause behind each line. When the sources don’t say, Clepso says so.',
  },
  {
    title: 'Access follows the matter',
    text: 'Who can see a matter is set per matter, so someone walled off from it sees nothing of it.',
  },
];

export function Trust() {
  return (
    <section aria-labelledby="trust-title" className="section-y trust-section">
      <div className="container-mk">
        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <SectionLabel index="05">Control</SectionLabel>
            <h2 id="trust-title" className="text-h2 mt-6 text-ink">
              Your practice.
              <span className="heading-accent"> Your judgment.</span>
            </h2>
            <p className="text-lede mt-6 max-w-[34rem] text-ink-2">
              Clepso helps prepare the work. Decisions about clients, advice and what gets sent stay
              with the lawyer responsible for the matter.
            </p>
            <ul className="mt-10 grid gap-6">
              {PRINCIPLES.map((p) => (
                <li key={p.title} className="border-l-2 border-accent/40 pl-5">
                  <p className="text-title-3 text-ink">{p.title}</p>
                  <p className="mt-1.5 text-body text-ink-2">{p.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-caption text-ink-3">
              Design principles for the product in preview, shown with sample data.
            </p>
          </div>

          <div className="col-span-12 grid content-start gap-5 lg:col-span-6 lg:col-start-7">
            <figure className="trust-panel rounded-xl border border-hairline">
              <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <span className="flex items-center gap-2 text-label text-ink">
                  <Icon name="lock" size={16} className="text-ink-2" /> Who can see {MATTER.id}
                </span>
                <StatusBadge status={statusOf('permissions')} />
              </figcaption>
              <ul className="divide-y divide-hairline">
                {ACCESS.map((a) => (
                  <li key={a.person} className="flex items-center gap-3 px-5 py-3">
                    <Avatar person={a.person} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-ink">{PEOPLE[a.person].name}</p>
                      <p className="text-caption text-ink-3">{PEOPLE[a.person].role}</p>
                    </div>
                    <span className="text-caption text-ink-2">{a.access}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 px-5 py-3">
                  <span
                    aria-hidden="true"
                    className="grid size-[30px] place-items-center rounded-full border border-dashed border-line text-[12px] font-semibold text-ink-3"
                  >
                    SO
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm text-ink-2">Sam Okafor</p>
                    <p className="text-caption text-ink-3">Associate</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-caption text-warning-ink">
                    <Icon name="shield" size={13} /> Walled off
                  </span>
                </li>
              </ul>
            </figure>

            <figure className="trust-panel rounded-xl border border-hairline lg:ml-8">
              <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <span className="flex items-center gap-2 text-label text-ink">
                  <Icon name="history" size={16} className="text-ink-2" /> Review record · client
                  update
                </span>
                <StatusBadge status={statusOf('activityHistory')} />
              </figcaption>
              <ol className="px-5 py-3">
                {RECORD.map((r) => (
                  <li key={r.time} className="flex items-start gap-3 py-2">
                    <span className="w-11 shrink-0 pt-0.5 text-caption text-ink-3 tabular">
                      {r.time}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
                        r.ai ? 'border-accent/60 text-accent' : 'border-line text-ink-3',
                      )}
                    >
                      <Icon name={r.icon} size={11} />
                    </span>
                    <p className="text-body-sm text-ink-2">
                      <span className="text-ink">{r.who}</span>{' '}
                      {r.text.charAt(0).toLowerCase() + r.text.slice(1)}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="border-t border-hairline px-5 py-3 text-caption text-ink-3">
                Sample record. The draft was prepared by software and sent by a person.
              </p>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
