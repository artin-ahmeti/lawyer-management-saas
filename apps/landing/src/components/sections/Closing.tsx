import { CtaButton, LoginLink } from '../site/Cta';
import { SectionLabel } from '../ui/SectionLabel';
import { VesselGlyph } from '../ui/VesselGlyph';

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="closing-section">
      <div className="container-mk">
        <div className="closing-card">
          <VesselGlyph settled className="closing-vessel" />
          <SectionLabel>Your next chapter</SectionLabel>
          <h2 id="closing-title" className="text-h2 mt-6 text-ink">
            Give your practice
            <br />
            <span className="heading-accent">room to focus.</span>
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[36rem] text-ink-2">
            A clearer way to manage the work around your legal work.
          </p>
          <div className="mt-8 grid justify-items-center gap-3">
            <CtaButton location="closing" size="lg" arrow />
            <LoginLink location="closing">Already using Clepso? Log in</LoginLink>
          </div>
        </div>
      </div>
    </section>
  );
}
