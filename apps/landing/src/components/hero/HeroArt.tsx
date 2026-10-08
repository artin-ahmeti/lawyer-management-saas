'use client';

import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { REQUESTED_DATE } from '@/content/sample-matter';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../ui/Icon';
import { MatterExcerpt } from './MatterExcerpt';
import { VesselCanvas } from './VesselCanvas';

/** Four pieces of work around the work, gathered into the vessel. Decorative: the result is the excerpt. */
const FRAGMENTS: { icon: IconName; text: string; meta: string; style: Record<string, string> }[] = [
  {
    icon: 'message',
    text: 'Revised draft attached',
    meta: 'Dana W. · 09:14',
    style: {
      '--fx': '-33cqw',
      '--fy': '-9cqw',
      '--fr': '-4deg',
      '--delay': '0.15s',
      '--dx': '-4cqw',
    },
  },
  {
    icon: 'file',
    text: 'MSA_v3 (final) (2).docx',
    meta: 'Which one is current?',
    style: {
      '--fx': '27cqw',
      '--fy': '-13cqw',
      '--fr': '3deg',
      '--delay': '0.35s',
      '--dx': '4cqw',
    },
  },
  {
    icon: 'calendar',
    text: `“…by ${REQUESTED_DATE.replace('Fri, ', 'Friday ')}?”`,
    meta: 'Review date, in an email',
    style: {
      '--fx': '-37cqw',
      '--fy': '11cqw',
      '--fr': '2deg',
      '--delay': '0.55s',
      '--dx': '-4cqw',
    },
  },
  {
    icon: 'clock',
    text: 'Call · 40 min',
    meta: 'Not recorded yet',
    style: { '--fx': '31cqw', '--fy': '9cqw', '--fr': '-3deg', '--delay': '0.75s', '--dx': '4cqw' },
  },
];

const reduceQuery = '(prefers-reduced-motion: reduce)';
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(reduceQuery);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function HeroArt() {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [threeActive, setThreeActive] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(reduceQuery).matches,
    () => false,
  );

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[520px] lg:aspect-[1/1.24] lg:max-w-none',
        paused && 'is-paused',
      )}
    >
      <div className="hero-art relative ml-auto aspect-[4/5] w-[84%] lg:absolute lg:right-0 lg:top-0">
        {/* Light pool under the object: static, subtle, one hue. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[14%] bottom-[1%] h-[12%] rounded-[50%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mk-cobalt)_16%,transparent),transparent)]"
        />
        {/* Pre-rendered, pre-sized WebP with its own srcset (scripts/render-vessel.mjs); no runtime optimiser needed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vessel/vessel-720.webp"
          srcSet="/vessel/vessel-480.webp 480w, /vessel/vessel-720.webp 720w, /vessel/vessel-1200.webp 1200w"
          sizes="(min-width: 1024px) 36vw, (min-width: 640px) 504px, 76vw"
          width={1200}
          height={1500}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className={cn(
            'absolute inset-0 size-full object-contain transition-opacity duration-700',
            threeActive && 'opacity-0',
          )}
        />
        <VesselCanvas paused={paused} onActive={setThreeActive} />

        <div key={run} aria-hidden="true" className="absolute inset-0">
          {FRAGMENTS.map((f) => (
            <div
              key={f.text}
              className="frag"
              style={{ ...(f.style as CSSProperties), left: '53%', top: '16%' }}
            >
              <div className="flex w-max max-w-[60cqw] items-center gap-2.5 rounded-md border border-hairline bg-raised px-3 py-2 shadow-md">
                <Icon name={f.icon} size={16} className="text-accent" />
                <span className="min-w-0">
                  <span className="block text-label text-ink">{f.text}</span>
                  <span className="block text-caption text-ink-3">{f.meta}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MatterExcerpt
        key={`excerpt-${run}`}
        className="relative z-10 -mt-[46%] w-[min(340px,80%)] sm:w-[min(360px,64%)] lg:absolute lg:left-[-10%] lg:top-[53%] lg:mt-0"
      />

      {!reduced ? (
        <div className="absolute bottom-0 right-0 z-10 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setRun((n) => n + 1);
              setPaused(false);
              track({ name: 'hero_replay' });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-caption text-ink-2 hover:bg-surface hover:text-ink"
          >
            <Icon name="replay" size={14} />
            Replay
          </button>
          {threeActive ? (
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => {
                setPaused((p) => !p);
                track({ name: 'motion_toggle', paused: !paused });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-caption text-ink-2 hover:bg-surface hover:text-ink"
            >
              <Icon name={paused ? 'play' : 'pause'} size={14} />
              {paused ? 'Play motion' : 'Pause motion'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
