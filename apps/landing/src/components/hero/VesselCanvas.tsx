'use client';

import { useEffect, useRef, useState } from 'react';
import { useLandingTheme } from '../site/ThemeProvider';
import type { VesselHandle } from './vessel-scene';

/** Optional enhancement. Failures leave the first-paint still visible. */
export function VesselCanvas({
  paused,
  reduced,
  onActive,
}: {
  paused: boolean;
  reduced: boolean;
  onActive: (active: boolean) => void;
}) {
  const { theme } = useLandingTheme();
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<VesselHandle | null>(null);
  const current = useRef({ paused, theme });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    current.current = { paused, theme };
    handle.current?.setPaused(paused);
    handle.current?.setTheme(theme);
  }, [paused, theme]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    if (
      !mq.matches ||
      nav.connection?.saveData ||
      (nav.hardwareConcurrency ?? 4) < 4 ||
      (nav.deviceMemory ?? 8) < 4
    )
      return;
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return;
    probe.getExtension('WEBGL_lose_context')?.loseContext();

    let disposed = false;
    let failed = false;
    let onScreen = false;
    const sync = () => {
      const h = handle.current;
      if (!h || failed) return;
      if (onScreen && document.visibilityState === 'visible' && mq.matches) h.start();
      else h.stop();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      sync();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => handle.current?.resize());
    ro.observe(canvas);
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !onScreen || current.current.paused) return;
      handle.current?.setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
    };
    document.addEventListener('visibilitychange', sync);
    const onContextLost = () => {
      failed = true;
      handle.current?.stop();
      setReady(false);
      onActive(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    mq.addEventListener('change', sync);
    window.addEventListener('pointermove', onPointer, { passive: true });
    const load = async () => {
      try {
        const { createVesselScene } = await import('./vessel-scene');
        if (disposed) return;
        const h = createVesselScene(canvas, {
          theme: current.current.theme,
          onFirstFrame: () => {
            if (!disposed) {
              setReady(true);
              onActive(true);
            }
          },
        });
        handle.current = h;
        h.setPaused(current.current.paused);
        sync();
      } catch {
        // A context/driver failure is an expected fallback, not a broken hero.
        handle.current?.dispose();
        handle.current = null;
        onActive(false);
      }
    };
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle
      ? window.requestIdleCallback(() => void load(), { timeout: 2500 })
      : window.setTimeout(() => void load(), 1200);
    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      mq.removeEventListener('change', sync);
      window.removeEventListener('pointermove', onPointer);
      handle.current?.dispose();
      handle.current = null;
      setReady(false);
      onActive(false);
    };
  }, [onActive, reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-ready={ready && !reduced}
      className="vessel-canvas pointer-events-none absolute inset-0 size-full"
    />
  );
}
