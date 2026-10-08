import { CtaButton } from '../site/Cta';
import { buttonClass } from '../ui/button-styles';
import { Icon } from '../ui/Icon';
import { HeroArt } from '../hero/HeroArt';

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="hero-section">
      <div className="container-mk hero-copy">
        <p className="hero-eyebrow fade-up">
          <span aria-hidden="true" /> A little more clarity. A lot more possibility.
        </p>
        <h1
          id="hero-title"
          className="hero-title fade-up"
          style={{ ['--delay' as string]: '0.1s' }}
        >
          <span>Every matter.</span>
          <span className="heading-accent">Moving forward.</span>
        </h1>
        <p className="hero-description fade-up" style={{ ['--delay' as string]: '0.2s' }}>
          Your matters, deadlines, documents and billing, beautifully connected. One workspace for
          your practice. More room for your legal work.
        </p>
        <div className="hero-actions fade-up" style={{ ['--delay' as string]: '0.3s' }}>
          <CtaButton location="hero" size="lg" arrow />
          <a href="#product" className={buttonClass('secondary', 'lg')}>
            Explore Clepso <Icon name="chevron-down" size={16} />
          </a>
        </div>
        <p className="hero-disclosure">
          Built for solo lawyers and small firms. In preview · demos use sample data.
        </p>
      </div>
      <HeroArt />
    </section>
  );
}
