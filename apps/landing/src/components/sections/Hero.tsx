import { CtaButton } from '../site/Cta';
import { buttonClass } from '../ui/button-styles';
import { HeroArt } from '../hero/HeroArt';
import { StatusBadge } from '../ui/StatusBadge';

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-clip">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_78%_34%,var(--surface),transparent_62%)]"
      />
      <div className="container-mk grid grid-cols-12 gap-x-6 pb-16 pt-28 sm:pt-32 lg:min-h-[min(100svh,1000px)] lg:items-center lg:pb-20 lg:pt-28">
        <div className="col-span-12 lg:col-span-7 xl:col-span-7">
          <p
            className="fade-up flex items-center gap-2.5 text-overline text-ink-2"
            style={{ ['--delay' as string]: '0s' }}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            Law practice management
          </p>
          <h1
            id="hero-title"
            className="line-reveal text-display mt-6 text-ink sm:[&>span]:max-w-none sm:[&>span]:whitespace-nowrap"
            aria-label="Every Matter. Moving Forward."
          >
            <span aria-hidden="true">
              <span>Every Matter.</span>
            </span>
            <span aria-hidden="true">
              <span className="text-ink-2" style={{ ['--delay' as string]: '0.09s' }}>
                Moving Forward.
              </span>
            </span>
          </h1>
          <p
            className="fade-up text-lede mt-7 max-w-[35rem] text-ink-2"
            style={{ ['--delay' as string]: '0.25s' }}
          >
            One workspace for your matters, deadlines, documents and billing, built for solo lawyers
            and small firms. AI that helps prepare the work, with you in control.
          </p>
          <div
            className="fade-up mt-9 flex flex-wrap items-center gap-3"
            style={{ ['--delay' as string]: '0.35s' }}
          >
            <CtaButton location="hero" size="lg" arrow />
            <a href="#product" className={buttonClass('secondary', 'lg')}>
              Explore the product
            </a>
          </div>
          <p
            className="fade-up mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-caption text-ink-3"
            style={{ ['--delay' as string]: '0.45s' }}
          >
            <StatusBadge status="preview" />
            Clepso is in preview. AI workflows are shown with sample data and are not yet generally
            available.
          </p>
        </div>
        <div className="col-span-12 mt-14 lg:col-span-5 lg:mt-0 lg:-mr-[calc(var(--mk-gutter)*0.6)] lg:pl-4">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
