import { notFound } from 'next/navigation';
import { VesselStill } from './VesselStill';

// Development only: renders the vessel alone on a transparent page so
// scripts/render-vessel.mjs can capture the static hero image from the real scene.
export default function VesselRenderPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <VesselStill />;
}

export const metadata = { robots: { index: false, follow: false } };
