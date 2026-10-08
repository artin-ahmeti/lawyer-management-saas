'use client';

import { useEffect, useRef, useState } from 'react';
import { nav } from '@/config/site';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/Icon';
import { CtaButton, LoginLink } from './Cta';
import { Wordmark } from './Wordmark';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    if (menuOpen && !el.open) el.showModal();
    if (!menuOpen && el.open) el.close();
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300 ease-[var(--ease-standard)]',
        scrolled
          ? 'border-hairline bg-canvas/88 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container-mk flex h-16 items-center gap-6 lg:h-[72px]">
        <Wordmark />
        <nav aria-label="Primary" className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-[15px] text-ink-2 transition-colors duration-[180ms] hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LoginLink
            location="header"
            className="hidden whitespace-nowrap min-[400px]:inline-flex"
          />
          <CtaButton location="header" className="ml-1 h-10 px-3.5 sm:ml-2 sm:h-11 sm:px-4" />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md text-ink hover:bg-surface md:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>

      <dialog
        ref={menu}
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        onClick={(e) => {
          if (e.target === menu.current) setMenuOpen(false);
        }}
        className="m-0 mt-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-ink backdrop:bg-transparent md:hidden"
      >
        <div
          className="container-mk flex h-16 items-center justify-between"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <Wordmark onNavigate={() => setMenuOpen(false)} />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-surface"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="x" />
          </button>
        </div>
        <nav aria-label="Mobile" className="container-mk pt-6">
          <ul className="divide-y divide-hairline border-y border-hairline">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-14 items-center justify-between text-h3 text-ink"
                >
                  {item.label}
                  <Icon name="chevron-right" className="text-ink-3" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-3">
            <CtaButton location="mobile-menu" size="lg" className="w-full" />
            <LoginLink location="mobile-menu" className="justify-center">
              Already using Clepso? Log in
            </LoginLink>
          </div>
        </nav>
      </dialog>
    </header>
  );
}
