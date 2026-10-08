import { vesselOutlinePath } from '../hero/vessel-profile';

/**
 * The simplified, flat form of the signature vessel: two hairline profiles and
 * a cobalt mouth. Decorative; separate from the wordmark.
 */
export function VesselGlyph({
  className,
  settled = false,
}: {
  className?: string;
  settled?: boolean;
}) {
  const w = 64;
  const h = 100;
  const { left, right } = vesselOutlinePath(w, h);
  return (
    <svg viewBox={`-2 -6 ${w + 4} ${h + 12}`} className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="glyph-mouth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--mk-cobalt)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--mk-cobalt)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {settled ? <ellipse cx={w / 2} cy={0} rx={w / 2} ry={3.4} fill="url(#glyph-mouth)" /> : null}
      <ellipse
        cx={w / 2}
        cy={0}
        rx={w / 2}
        ry={3.4}
        stroke="var(--accent)"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      <path d={left} stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      <path d={right} stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      <ellipse
        cx={w / 2}
        cy={h}
        rx={(w / 2) * 0.755}
        ry={2.6}
        stroke="currentColor"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {!settled ? (
        <path
          d={`M${w / 2} ${h * 0.12} V${h * 0.9}`}
          stroke="var(--accent)"
          strokeWidth={1.25}
          strokeDasharray="1.5 5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
