'use client';

import { useEffect, useRef, useState } from 'react';
import type { VesselHandle } from './vessel-scene';

/**
 * Lazy 3D upgrade over the static render. Loads only on capable desktops (wide
 * viewport, fine pointer, WebGL, no reduced motion, no data saver), after the
 * page is idle. Renders only while on screen and the tab is visible.
 */
export function VesselCanvas({
  paused,
  onActive,
}: {
  paused: boolean;
  onActive: (active: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<VesselHandle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    const capable =
      window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !nav.connection?.saveData &&
      (nav.hardwareConcurrency ?? 4) >= 4 &&
      (nav.deviceMemory ?? 8) >= 4 &&
      Boolean(document.createElement('canvas').getContext('webgl2'));
    if (!capable) return;

    let disposed = false;
    let visible = true;
    let onScreen = true;
    const cleanups: (() => void)[] = [];

    const sync = () => {
      const h = handle.current;
      if (!h) return;
      if (visible && onScreen) h.start();
      else h.stop();
    };

    const load = async () => {
      const { createVesselScene } = await import('./vessel-scene');
      if (disposed) return;
      const h = createVesselScene(canvas, {
        onFirstFrame: () => {
          setReady(true);
          onActive(true);
        },
      });
      handle.current = h;
      sync();

      const io = new IntersectionObserver(([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        sync();
      });
      io.observe(canvas);
      const onVisibility = () => {
        visible = document.visibilityState === 'visible';
        sync();
      };
      document.addEventListener('visibilitychange', onVisibility);
      const ro = new ResizeObserver(() => h.resize());
      ro.observe(canvas);
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        h.setPointer(
          (e.clientX / window.innerWidth) * 2 - 1,
          (e.clientY / window.innerHeight) * 2 - 1,
        );
      };
      window.addEventListener('pointermove', onPointer, { passive: true });
      cleanups.push(
        () => io.disconnect(),
        () => document.removeEventListener('visibilitychange', onVisibility),
        () => ro.disconnect(),
        () => window.removeEventListener('pointermove', onPointer),
      );
    };

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle
      ? window.requestIdleCallback(() => void load(), { timeout: 2500 })
      : window.setTimeout(() => void load(), 1200);

    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanups.forEach((fn) => fn());
      handle.current?.dispose();
      handle.current = null;
      onActive(false);
    };
  }, [onActive]);

  useEffect(() => {
    handle.current?.setPaused(paused);
  }, [paused]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-ready={ready}
      className="vessel-canvas pointer-events-none absolute inset-0 size-full"
    />
  );
}
