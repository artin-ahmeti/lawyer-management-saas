/**
 * The vessel's profile, shared by the 3D scene and the flat glyph so both are
 * the same object. No three.js import here.
 */
export const VESSEL = {
  half: 1.62, // half height
  waist: 0.11,
  top: 1.06,
  bottom: 0.8,
  wall: 0.04,
} as const;

/** Radius of the outer surface at height y: a slender neck flaring into a tulip mouth. */
export function vesselRadius(y: number): number {
  const top = y >= 0;
  const t = Math.min(1, Math.abs(y) / VESSEL.half);
  const flare = top
    ? Math.pow(t, 1.55) * 0.82 + Math.pow(t, 6) * 0.18
    : Math.pow(t, 2.1) * 0.7 + Math.pow(t, 6) * 0.3;
  return VESSEL.waist + ((top ? VESSEL.top : VESSEL.bottom) - VESSEL.waist) * flare;
}

/** SVG path of the silhouette, in a box of the given size (y down). */
export function vesselOutlinePath(
  width: number,
  height: number,
  steps = 64,
): { left: string; right: string } {
  const scaleX = width / 2 / Math.max(VESSEL.top, VESSEL.bottom);
  const scaleY = height / (VESSEL.half * 2);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const y = VESSEL.half - (i / steps) * VESSEL.half * 2;
    pts.push([vesselRadius(y) * scaleX, (VESSEL.half - y) * scaleY]);
  }
  const cx = width / 2;
  const fmt = (n: number) => n.toFixed(2);
  const left = pts.map(([r, y], i) => `${i ? 'L' : 'M'}${fmt(cx - r)} ${fmt(y)}`).join(' ');
  const right = pts.map(([r, y], i) => `${i ? 'L' : 'M'}${fmt(cx + r)} ${fmt(y)}`).join(' ');
  return { left, right };
}
