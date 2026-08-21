/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@lawfirm/ui/tailwind-preset')],
  theme: {
    extend: {},
  },
};
