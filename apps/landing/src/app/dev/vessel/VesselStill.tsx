'use client';

import { useEffect, useRef, useState } from 'react';
import { createVesselScene } from '@/components/hero/vessel-scene';

export function VesselStill() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const handle = createVesselScene(ref.current, {
      still: true,
      onFirstFrame: () => setReady(true),
    });
    handle.start();
    const t = window.setTimeout(() => handle.stop(), 400);
    return () => {
      window.clearTimeout(t);
      handle.dispose();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      data-ready={ready}
      id="vessel"
      style={{ display: 'block', width: 1000, height: 1250 }}
    />
  );
}
