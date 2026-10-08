import { AiWorkflows } from '@/components/demo/AiWorkflows';
import { Capabilities } from '@/components/sections/Capabilities';
import { Closing } from '@/components/sections/Closing';
import { Faq } from '@/components/sections/Faq';
import { Hero } from '@/components/sections/Hero';
import { ProductReveal } from '@/components/sections/ProductReveal';
import { Recognition } from '@/components/sections/Recognition';
import { Trust } from '@/components/sections/Trust';
import { CtaProvider } from '@/components/site/Cta';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';

export default function Home() {
  return (
    <CtaProvider>
      <a
        href="#main"
        className="fixed left-4 top-3 z-50 -translate-y-24 rounded-md bg-cobalt px-4 py-2.5 text-on-cobalt transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Recognition />
        <ProductReveal />
        <AiWorkflows />
        <Capabilities />
        <Trust />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </CtaProvider>
  );
}
