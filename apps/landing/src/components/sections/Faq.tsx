'use client';

import { allPreview } from '@/config/features';
import { primaryCtaLabel, site } from '@/config/site';
import { track } from '@/lib/analytics';
import { Icon } from '../ui/Icon';
import { SectionLabel } from '../ui/SectionLabel';

/**
 * Only questions the confirmed material can answer. Open questions (imports,
 * security specifics, pricing, integrations, model training) stay in HANDOFF.md
 * until they have real answers.
 */
const FAQ: { id: string; q: string; a: React.ReactNode }[] = [
  {
    id: 'what',
    q: 'What is Clepso?',
    a: 'Law practice management for solo lawyers and small firms. Matters, tasks and dates, documents, client communication, time and billing share one workspace on the web and on your phone, and AI helps prepare routine work for you to review.',
  },
  {
    id: 'available',
    q: 'Which features can I use today?',
    a: allPreview
      ? 'Clepso is in preview, so nothing on this page is generally available yet. Each section is labelled Available, Preview or Planned, and every demonstration uses sample data.'
      : 'Each section is labelled Available, Preview or Planned. Anything marked Preview or Planned is not generally available, and demonstrations use sample data.',
  },
  {
    id: 'ai-review',
    q: 'Does the AI act on its own?',
    a: 'No. In the workflows shown here, AI prepares drafts, summaries and suggested actions, and a person reviews them before anything is saved or sent. Answers point to the sources they came from, and when the sources don’t say, Clepso says so instead of guessing.',
  },
  {
    id: 'deadlines',
    q: 'Does Clepso calculate court deadlines?',
    a: 'Not in this preview. When an email asks for something by a date, Clepso shows that date as written and where it came from. It does not treat it as a legally calculated deadline, and every date keeps an owner who is responsible for it.',
  },
  {
    id: 'who',
    q: 'Who is it for?',
    a: 'Solo lawyers and small firms, and the associates, paralegals and staff who keep the work moving day to day. It is designed for firms where the same few people handle the legal work and the running of the practice.',
  },
  {
    id: 'start',
    q: 'How do I get started?',
    a:
      site.launchMode === 'signup'
        ? `Choose ${primaryCtaLabel} to create your firm’s workspace. If you already have an account, use Log in at the top of the page.`
        : 'Request early access and tell us about your firm. We will reply to the email address you give us.',
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="section-y relative bg-deep">
      <div className="container-mk grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <SectionLabel index="06">FAQ</SectionLabel>
          <h2 id="faq-title" className="text-h2 mt-6 text-ink">
            Questions, answered plainly.
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:col-start-6">
          <ul className="border-t border-hairline">
            {FAQ.map((item) => (
              <li key={item.id} className="border-b border-hairline">
                <details
                  className="group"
                  onToggle={(e) => {
                    if ((e.currentTarget as HTMLDetailsElement).open)
                      track({ name: 'faq_open', question: item.id });
                  }}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-title-3 text-ink hover:text-ink focus-visible:outline-offset-4">
                    {item.q}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-2 transition-colors group-open:border-accent/60 group-open:text-accent">
                      <Icon
                        name="chevron-down"
                        size={16}
                        className="faq-caret transition-transform duration-300"
                      />
                    </span>
                  </summary>
                  <p className="max-w-[60ch] pb-6 pr-12 text-body text-ink-2">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
