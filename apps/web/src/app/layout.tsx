import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import '@lawfirm/ui-web/clepso.base.css';
import './globals.css';
import { readThemeCookie, THEME_COOKIE } from '@/lib/theme-cookie';
import { Providers } from './providers';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Clepso', template: '%s · Clepso' },
  description:
    'Practice management for small law firms: capture the work, bill from anywhere, get paid.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = readThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={theme === 'system' ? undefined : theme}
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers theme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
