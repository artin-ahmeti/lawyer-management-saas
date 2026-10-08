import { CtaButton, LoginLink } from '../site/Cta';
import { VesselGlyph } from '../ui/VesselGlyph';

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="relative overflow-clip">
      <div className="container-mk grid justify-items-center pb-[var(--mk-section)] pt-[calc(var(--mk-section)*0.9)] text-center">
        <VesselGlyph settled className="h-36 w-24 text-line-strong" />
        <h2 id="closing-title" className="text-h2 mt-10 max-w-[16ch] text-ink">
          <span className="block">Give your practice</span>
          <span className="block text-ink-2">room to focus.</span>
        </h2>
        <p className="text-lede mt-6 max-w-[36rem] text-ink-2">
          A clearer way to manage the work around your legal work.
        </p>
        <div className="mt-10 grid justify-items-center gap-4">
          <CtaButton location="closing" size="lg" arrow />
          <LoginLink location="closing">Already using Clepso? Log in</LoginLink>
        </div>
      </div>
    </section>
  );
}
