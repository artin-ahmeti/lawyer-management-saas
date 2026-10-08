import { SectionLabel } from '../ui/SectionLabel';

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

export function Recognition() {
  return (
    <section aria-labelledby="recognition-title" className="recognition-section">
      <div className="container-mk">
        <div className="recognition-intro">
          <div>
            <SectionLabel>The work around the work</SectionLabel>
            <h2 id="recognition-title" className="mt-4 text-ink">
              Your time belongs to your practice.
            </h2>
          </div>
          <p className="text-body text-ink-2">
            Finding a file. Chasing an update. Rebuilding yesterday’s time. Small interruptions add
            up. A connected workspace gives the pieces a place.
          </p>
        </div>
        <ul className="research-grid">
          {RESEARCH.map((r) => (
            <li key={r.source}>
              <p>
                <span className="research-figure text-ink tabular">{r.figure}</span>
                {r.unit ? <span className="ml-2 text-body text-ink-2">{r.unit}</span> : null}
              </p>
              <p className="mt-3 text-body-sm text-ink-2">{r.text}</p>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center text-caption text-ink-3 underline decoration-line underline-offset-4 hover:text-ink"
              >
                {r.source}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-ink-3">Third-party research, not Clepso results.</p>
      </div>
    </section>
  );
}
