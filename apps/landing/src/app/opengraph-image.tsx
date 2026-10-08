import { ImageResponse } from 'next/og';
import { vesselOutlinePath } from '@/components/hero/vessel-profile';

// Social preview: the wordmark, the headline and the vessel's flat form.
// Colours are the dark tokens (--bg, --ink, --ink-2, --accent) and brand cobalt;
// next/og renders outside the stylesheet, so the values are written out here.
export const alt = 'Clepso: law practice management. Every Matter. Moving Forward.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  const w = 190;
  const h = 300;
  const { left, right } = vesselOutlinePath(w, h);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '72px 96px',
        background: '#12151B',
        color: '#EEF0F4',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>Clepso</div>
        <div style={{ marginTop: 64, fontSize: 18, letterSpacing: 2, color: '#A9B1BE' }}>
          LAW PRACTICE MANAGEMENT
        </div>
        <div
          style={{ marginTop: 20, fontSize: 88, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}
        >
          Every Matter.
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 600,
            letterSpacing: -4,
            lineHeight: 1,
            color: '#A9B1BE',
          }}
        >
          Moving Forward.
        </div>
      </div>
      <svg width={w + 8} height={h + 16} viewBox={`-4 -8 ${w + 8} ${h + 16}`}>
        <ellipse cx={w / 2} cy={0} rx={w / 2} ry={9} fill="#2B52D9" />
        <ellipse cx={w / 2} cy={0} rx={w / 2} ry={9} fill="none" stroke="#88A3FF" strokeWidth={2} />
        <path d={left} fill="none" stroke="#6E7686" strokeWidth={2} />
        <path d={right} fill="none" stroke="#6E7686" strokeWidth={2} />
        <ellipse
          cx={w / 2}
          cy={h}
          rx={(w / 2) * 0.755}
          ry={7}
          fill="none"
          stroke="#6E7686"
          strokeWidth={2}
        />
      </svg>
    </div>,
    size,
  );
}
