/**
 * Tailwind preset consumed by apps/mobile (NativeWind, TW 3.4) and later
 * apps/web + apps/portal. Values mirror src/tokens.ts — keep in sync.
 * Dark-first: these ARE the dark theme values.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: '#1B2632',
        surface: '#2C3B4D',
        sunken: '#141d27',
        ink: '#EEE9DF',
        'ink-muted': '#C9C1B1',
        'ink-faint': '#8B94A3',
        primary: {
          DEFAULT: '#FFB162',
          pressed: '#E89C50',
          fg: '#1B2632',
        },
        rust: '#A35139',
        danger: '#C96A50',
        success: '#9CB380',
        warning: '#FFB162',
        line: '#3A4A5E',
        'line-faint': 'rgba(37, 51, 66, 0.45)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', fontWeight: '700' }],
        title: ['20px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '21px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
    },
  },
};
