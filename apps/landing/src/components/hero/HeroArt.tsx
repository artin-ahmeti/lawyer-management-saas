'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { useLandingTheme } from '../site/ThemeProvider';
import { Icon, type IconName } from '../ui/Icon';
import { MatterExcerpt } from './MatterExcerpt';
import { VesselCanvas } from './VesselCanvas';

const ARTIFACTS: {
  icon: IconName;
  label: string;
  title: string;
  meta: string;
  className: string;
}[] = [
  {
    icon: 'message',
    label: 'Client email',
    title: 'Revised draft attached',
    meta: 'Dana W. · 09:14',
    className: 'artifact-email',
  },
  {
    icon: 'file',
    label: 'Document',
    title: 'MSA_v3 (final) (2).docx',
    meta: 'Which version is current?',
    className: 'artifact-document',
  },
  {
    icon: 'calendar',
    label: 'Requested date',
    title: '“By Friday 9 October?”',
    meta: 'A date buried in an email',
    className: 'artifact-date',
  },
  {
    icon: 'clock',
    label: 'Time to record',
    title: 'Client call · 40 min',
    meta: 'Keep the work accounted for',
    className: 'artifact-time',
  },
];
const reduceQuery = '(prefers-reduced-motion: reduce)';
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(reduceQuery);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function HeroArt() {
  const { theme } = useLandingTheme();
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(true);
  const [threeActive, setThreeActive] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(reduceQuery).matches,
    () => false,
  );
  const prefix = theme === 'light' ? 'vessel-light' : 'vessel';

  useEffect(() => {
    let onScreen = true;
    const sync = () => setActive(onScreen && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      sync();
    });
    if (stage.current) observer.observe(stage.current);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return (
    <div
      ref={stage}
      className={cn('clepsydra-stage', paused && 'is-paused', !active && 'is-inactive')}
      aria-label="Scattered work, connected to one matter"
    >
      <div aria-hidden="true" className="hero-orbit" />
      <svg aria-hidden="true" className="hero-connection" viewBox="0 0 600 160" fill="none">
        <path
          d="M0 0C170 0 150 125 290 135M600 30C440 30 450 125 310 135"
          stroke="var(--accent)"
          strokeDasharray="3 6"
        />
      </svg>
      <div className="vessel-object">
        <div aria-hidden="true" className="vessel-glow" />
        {/* Stills and the optional canvas are rendered from the same original scene. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/vessel/${prefix}-720.webp`}
          srcSet={`/vessel/${prefix}-480.webp 480w, /vessel/${prefix}-720.webp 720w, /vessel/${prefix}-1200.webp 1200w`}
          sizes="(min-width:1024px) 420px, (min-width:640px) 370px, 290px"
          width={1200}
          height={1500}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className={cn('transition-opacity duration-700', threeActive && !reduced && 'opacity-0')}
        />
        <VesselCanvas paused={paused || !active} reduced={reduced} onActive={setThreeActive} />
      </div>
      <div key={`artifacts-${run}`} aria-hidden="true">
        {ARTIFACTS.map((artifact) => (
          <div key={artifact.label} className={cn('hero-artifact', artifact.className)}>
            <div className="hero-artifact-header">
              <span className="hero-artifact-icon">
                <Icon name={artifact.icon} size={14} />
              </span>
              {artifact.label}
            </div>
            <p>{artifact.title}</p>
            <small>{artifact.meta}</small>
          </div>
        ))}
      </div>
      <div className="hero-output">
        <MatterExcerpt key={`excerpt-${run}`} />
      </div>
      <svg
        aria-hidden="true"
        className="hero-canopy"
        viewBox="0 0 1320 315"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="canopy-fill"
            x1="660"
            y1="0"
            x2="660"
            y2="315"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--mk-glow)" stopOpacity=".4" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="canopy-edge">
            <stop stopColor="var(--accent)" stopOpacity="0" />
            <stop offset=".5" stopColor="var(--accent)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M645 0C645 215 330 210 0 315H1320C990 210 675 215 675 0Z"
          fill="url(#canopy-fill)"
        />
        <path
          d="M645 0C645 215 330 210 0 315M675 0C675 215 990 210 1320 315"
          fill="none"
          stroke="url(#canopy-edge)"
        />
      </svg>
      {!reduced ? (
        <div className="motion-controls">
          <button
            type="button"
            onClick={() => {
              setRun((n) => n + 1);
              setPaused(false);
              track({ name: 'hero_replay' });
            }}
          >
            <Icon name="replay" size={13} /> Replay
          </button>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => {
              setPaused((p) => !p);
              track({ name: 'motion_toggle', paused: !paused });
            }}
          >
            <Icon name={paused ? 'play' : 'pause'} size={13} />
            {paused ? 'Play motion' : 'Pause motion'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
