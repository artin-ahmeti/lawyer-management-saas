import { nav, site } from '@/config/site';
import { LoginLink } from './Cta';
import { Wordmark } from './Wordmark';

/** Compact footer: only destinations that exist are shown. */
export function Footer() {
  const legal = [
    site.privacyUrl ? { href: site.privacyUrl, label: 'Privacy' } : null,
    site.termsUrl ? { href: site.termsUrl, label: 'Terms' } : null,
  ].filter((l): l is { href: string; label: string } => l !== null);

  return (
    <footer className="site-footer border-t border-hairline">
      <div className="container-mk grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <Wordmark />
          <p className="mt-2 max-w-[32ch] text-body-sm text-ink-3">
            Law practice management for solo lawyers and small firms.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-6 text-body-sm">
          <ul className="grid gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="grid content-start gap-1">
            <li>
              <LoginLink location="footer" className="px-0 text-body-sm font-normal" />
            </li>
            {site.contactEmail ? (
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink"
                >
                  Contact
                </a>
              </li>
            ) : null}
            {legal.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <svg aria-hidden="true" focusable="false" className="footer-signature" viewBox="0 0 1000 240">
        <text
          x="500"
          y="204"
          textAnchor="middle"
          fill="currentColor"
          fontSize="240"
          fontWeight="550"
          letterSpacing="-16"
        >
          clepso.
        </text>
      </svg>
      <div className="container-mk flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-6 text-caption text-ink-3">
        <p>© {new Date().getFullYear()} Clepso</p>
        {site.stage === 'preview' ? <p>Preview build · sample data · not indexed</p> : null}
      </div>
    </footer>
  );
}
