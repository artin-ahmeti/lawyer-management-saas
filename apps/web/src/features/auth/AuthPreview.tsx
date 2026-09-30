'use client';

import { Avatar, Icon, IconWell, Pill, type IconName } from '@lawfirm/ui-web';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { clock } from '@/lib/format';
import { useTheme } from '@/lib/theme';

const TICKS = [
  'Transcribing voice memo · “Bennett, point three…”',
  'Drafted 0.2h · Call with Sofia Alvarez · L390',
  'Deadline chain updated · Inventory filing Fri Oct 3',
  'Pay link opened · INV-2026-078 · Margaret Bennett',
  'Pre-bill ready · 6 matters · $41,300 unbilled',
];
const STEPS: { icon: IconName; title: string; sub: string }[] = [
  {
    icon: 'phone',
    title: 'Call ended · Sofia Alvarez · 12 min',
    sub: 'Detected from your phone log · 10:24 AM',
  },
  {
    icon: 'pen',
    title: 'Entry drafted',
    sub: '“Call with client re: discovery responses” · 0.2h · L390',
  },
  { icon: 'check', title: 'Approved with one tap', sub: 'Billable · $85.00 at $425/h' },
  { icon: 'receipt', title: 'Added to pre-bill', sub: 'Alvarez v. Meridian · INV-2026-096' },
];
const CYCLE_SECONDS = 13;
const TIMER_START = 42 * 60 + 17;

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 12px 0 8px',
  borderRadius: 'var(--radius-full)',
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-md)',
  color: 'var(--ink)',
  font: 'var(--text-label)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
/** 22px tonal well for the floating pills. */
function SmallWell({ name, tone }: { name: IconName; tone: 'accent' | 'info' | 'success' }) {
  return (
    <span
      className={`cl-ic-well cl-ic-well--${tone}`}
      style={{ width: 22, height: 22, borderRadius: 6 }}
      aria-hidden="true"
    >
      <Icon name={name} style={{ width: 13, height: 13 }} />
    </span>
  );
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h.slice(0, 6),
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * The product preview beside the auth forms: accent waves on a canvas, a live
 * ticker, and a floating dark dashboard frame that replays "Review your day"
 * on a 13-second loop. Motion stops under prefers-reduced-motion.
 */
export function AuthPreview() {
  const { scheme } = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const [tick, setTick] = useState(0);
  const [tickerHidden, setTickerHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const grow = setTimeout(() => setMounted(true), 150);
    let fade: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      const next = tickRef.current + 1;
      tickRef.current = next;
      if (next % 4 === 0) {
        // The ticker fades out, swaps its line, and fades back in.
        setTickerHidden(true);
        fade = setTimeout(() => {
          setTick(next);
          setTickerHidden(false);
        }, 300);
      } else setTick(next);
    }, 1000);
    return () => {
      clearTimeout(grow);
      clearTimeout(fade);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const dark = scheme === 'dark';
    const draw = (now: number) => {
      const host = canvas.parentElement;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(host);
      const bg = cs.getPropertyValue('--bg').trim() || (dark ? '#12151B' : '#F7F8FA');
      const [r, g, b] = hexToRgb(cs.getPropertyValue('--accent').trim() || '#2B52D9');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const t = now / 1000;
      const glow = ctx.createRadialGradient(w * 0.8, h * 0.12, 0, w * 0.8, h * 0.12, w * 0.8);
      glow.addColorStop(0, `rgba(${r},${g},${b},${dark ? 0.22 : 0.16})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const base = h * (0.48 + i * 0.11);
        const amp = 26 + i * 12;
        const k = 0.0032 * (1 + i * 0.25);
        const sp = 0.32 + i * 0.11;
        const y = (x: number) =>
          base + Math.sin(x * k + t * sp + i) * amp + Math.sin(x * 0.009 - t * 0.5 + i * 2) * 12;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y(x));
        ctx.lineTo(w, h);
        ctx.closePath();
        const gr = ctx.createLinearGradient(0, base - amp, 0, h);
        const a = (dark ? 0.16 : 0.12) - i * 0.025;
        gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          if (x) ctx.lineTo(x, y(x));
          else ctx.moveTo(x, y(x));
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${(dark ? 0.45 : 0.35) - i * 0.08})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [scheme, reduced]);

  const onParallax = (e: MouseEvent<HTMLElement>) => {
    const el = frameRef.current;
    if (!el || reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${-14 + x * 8}deg) rotateX(${7 - y * 6}deg) translate3d(${x * -12}px, ${y * -10}px, 0)`;
  };
  const resetParallax = () => {
    const el = frameRef.current;
    if (el) el.style.transform = 'rotateY(-14deg) rotateX(7deg)';
  };

  const pos = tick % CYCLE_SECONDS;
  const stage = Math.min(4, Math.floor(pos / 2.5));
  const billed = stage >= 3 ? 3.6 : 3.4;
  const bars = [78, 52, 70, (billed / 6) * 100 * 0.6, 0];
  const tickerText = TICKS[Math.floor(tick / 4) % TICKS.length];
  const float = (duration: string, delay = '0s'): CSSProperties =>
    reduced ? {} : { animation: `cl-float ${duration} ease-in-out ${delay} infinite` };
  const pulse: CSSProperties = reduced ? {} : { animation: 'cl-pulse 1.4s ease-in-out infinite' };

  return (
    <aside
      aria-label="Clepso product preview"
      onMouseMove={onParallax}
      onMouseLeave={resetParallax}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        perspective: 1500,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      <div
        style={{
          position: 'relative',
          padding: '52px 56px 0 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 580,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            height: 28,
            padding: '0 10px 0 5px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            font: 'var(--text-caption)',
            fontWeight: 600,
            color: 'var(--ink-2)',
          }}
        >
          <span
            className="cl-ic-well"
            style={{ width: 18, height: 18, borderRadius: 5 }}
            aria-hidden="true"
          >
            <Icon name="pen" style={{ width: 11, height: 11, strokeWidth: 2.5 }} />
          </span>
          AI drafts · you approve
        </div>
        <h2
          className="cl-t-display"
          style={{
            fontSize: 42,
            lineHeight: '46px',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
            margin: 0,
          }}
        >
          Your day, already billed.
        </h2>
        <p className="cl-t-body cl-muted" style={{ textWrap: 'pretty', maxWidth: 420, margin: 0 }}>
          AI captures the work. You approve. Clients pay.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            font: 'var(--text-label)',
            fontWeight: 500,
            color: 'var(--ink-2)',
            minHeight: 22,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              flex: 'none',
              ...pulse,
            }}
          />
          <span
            aria-live="polite"
            style={{
              opacity: tickerHidden ? 0 : 1,
              transform: tickerHidden ? 'translateY(4px)' : 'translateY(0)',
              transition:
                'opacity 280ms var(--ease-standard), transform 280ms var(--ease-standard)',
            }}
          >
            {tickerText}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, marginTop: 40, minHeight: 560 }}>
        <div
          ref={frameRef}
          style={{
            position: 'absolute',
            left: 72,
            top: 0,
            width: 640,
            transformStyle: 'preserve-3d',
            transition: 'transform 800ms var(--ease-standard)',
            transform: 'rotateY(-14deg) rotateX(7deg)',
            willChange: 'transform',
          }}
        >
          <div style={float('9s')}>
            <div
              className="cl-theme-dark"
              style={{
                width: 640,
                borderRadius: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg), 0 48px 90px -36px var(--accent)',
                color: 'var(--ink)',
                font: 'var(--text-body-sm)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  height: 52,
                  padding: '0 18px',
                  borderBottom: '1px solid var(--hairline)',
                  background: 'var(--surface-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar size="xs" tone="accent" initials="DO" />
                  <span className="cl-t-label" style={{ color: 'var(--ink)' }}>
                    Today
                  </span>
                  <span className="cl-t-label cl-faint">Mon, Sep 29</span>
                </div>
                <div className="cl-topbar__timer" style={{ height: 30 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      ...pulse,
                    }}
                  />
                  <span className="title">Estate of Bennett</span>
                  <span className="time">{clock(TIMER_START + tick)}</span>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)',
                  gap: 18,
                  padding: 18,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span className="cl-t-title-3">Review your day</span>
                    <Pill tone="accent" dot>
                      Automating
                    </Pill>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {STEPS.map((s, i) => {
                      const done = i < stage;
                      const active = i === stage;
                      const upcoming = i > stage;
                      return (
                        <div
                          key={s.title}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: active ? 'var(--accent-tint)' : 'var(--surface-2)',
                            border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                            opacity: upcoming ? 0.38 : 1,
                            transform: `translateX(${upcoming ? 6 : 0}px)`,
                            transition: 'all 500ms var(--ease-standard)',
                          }}
                        >
                          <IconWell
                            name={s.icon}
                            tone={done ? 'success' : active ? 'accent' : 'neutral'}
                            className="app-plan-feature-icon"
                          />
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            <span
                              className="cl-t-label cl-truncate"
                              style={{ color: 'var(--ink)', fontWeight: 600 }}
                            >
                              {s.title}
                            </span>
                            <span className="cl-t-caption cl-muted cl-truncate">{s.sub}</span>
                          </div>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 'none',
                              background: done
                                ? 'var(--success-dot)'
                                : active
                                  ? 'transparent'
                                  : 'var(--surface-3)',
                              color: 'var(--on-accent)',
                              transition: 'all 400ms var(--ease-standard)',
                            }}
                          >
                            {done ? (
                              <Icon
                                name="check"
                                style={{ width: 12, height: 12, strokeWidth: 3 }}
                              />
                            ) : null}
                            {active ? (
                              <span
                                className="cl-spinner"
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderWidth: 2,
                                  color: 'var(--accent)',
                                  ...(reduced ? { animation: 'none' } : {}),
                                }}
                              />
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="cl-kpi cl-kpi--tint" style={{ padding: '14px 16px 12px' }}>
                    <span className="cl-kpi__label">Billed today</span>
                    <span className="cl-kpi__value" style={{ transition: 'all 400ms' }}>
                      {billed.toFixed(1)}
                      <small>of 6h</small>
                    </span>
                    <div className="cl-progress">
                      <div
                        className="cl-progress__bar"
                        style={{
                          width: `${Math.round((billed / 6) * 100)}%`,
                          transition: 'width 900ms var(--ease-standard)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="cl-kpi" style={{ padding: '14px 16px', flex: 1, gap: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span className="cl-kpi__label">Hours this week</span>
                      <span
                        className="cl-t-label cl-num"
                        style={{ color: 'var(--ink)', fontWeight: 600 }}
                      >
                        21.4h
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
                        gap: 8,
                        alignItems: 'end',
                        height: 84,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '34%',
                          borderTop: '1px dashed var(--border-strong)',
                          opacity: 0.7,
                        }}
                      />
                      {bars.map((h, i) => (
                        <span
                          key={i}
                          style={{
                            height: mounted ? `${Math.max(h, 2)}%` : 2,
                            background:
                              i === 3
                                ? 'var(--accent)'
                                : i === 4
                                  ? 'var(--surface-2)'
                                  : 'var(--chart-seq-3, var(--accent-ink))',
                            borderRadius: '3px 3px 1px 1px',
                            transition: `height 900ms var(--ease-standard) ${i * 90}ms`,
                            minHeight: 2,
                            position: 'relative',
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
                        gap: 8,
                        font: 'var(--text-caption)',
                        color: 'var(--ink-3)',
                        textAlign: 'center',
                      }}
                    >
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Today</span>
                      <span>Fri</span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 18px 14px',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <IconWell name="send" tone="success" className="app-plan-feature-icon" />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span className="cl-t-label" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                      Pre-bill ready · 6 matters
                    </span>
                    <span className="cl-t-label cl-num" style={{ color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--ink-2)' }}>$41,300 →</span>{' '}
                      {stage >= 4 ? '$8,210.00 invoiced' : '$8,125.00 invoiced'}
                    </span>
                  </div>
                  <div className="cl-progress" style={{ margin: 0 }}>
                    <div
                      className="cl-progress__bar"
                      style={{
                        width: stage >= 4 ? '24%' : '20%',
                        transition: 'width 1200ms var(--ease-standard)',
                      }}
                    />
                  </div>
                </div>
                <span className="cl-btn cl-btn--primary" style={{ height: 32 }} aria-hidden="true">
                  Send invoices
                </span>
              </div>
            </div>
          </div>

          <div
            style={{ position: 'absolute', right: -88, top: -26, transform: 'translateZ(90px)' }}
          >
            <div className="cl-theme-dark" style={float('7s', '-2s')}>
              <span style={pillStyle}>
                <SmallWell name="mic" tone="accent" />
                Voice memo → 0.3h entry
              </span>
            </div>
          </div>
          <div
            style={{ position: 'absolute', left: -58, bottom: 62, transform: 'translateZ(120px)' }}
          >
            <div className="cl-theme-dark" style={float('8s', '-4s')}>
              <span style={pillStyle}>
                <SmallWell name="calendar" tone="info" />
                Deadline chain · filing Fri Oct 3
              </span>
            </div>
          </div>
          <div
            style={{ position: 'absolute', right: -40, bottom: -30, transform: 'translateZ(70px)' }}
          >
            <div className="cl-theme-dark" style={float('6.5s', '-1s')}>
              <span style={pillStyle}>
                <SmallWell name="check" tone="success" />
                Paid · Margaret Bennett · $8,125.00
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
