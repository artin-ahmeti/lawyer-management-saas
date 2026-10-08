import '@lawfirm/ui-web/clepso.tokens.css';
import './globals.css';
import './theme.css';
import './redesign.css';
import './hero.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { site } from '@/config/site';
import { LANDING_THEME_COLOR } from '@/config/theme';
import { ThemeProvider } from '@/components/site/ThemeProvider';
import { getLandingTheme } from '@/lib/landing-theme';

// The design system's families (Geist + Geist Mono, OFL), self-hosted by next/font.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  applicationName: site.name,
  metadataBase: site.url ? new URL(site.url) : undefined,
  alternates: site.url ? { canonical: '/' } : undefined,
  robots: site.indexable ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await getLandingTheme();
  return {
    themeColor: LANDING_THEME_COLOR[theme],
    colorScheme: theme,
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getLandingTheme();
  return (
    <html lang="en" data-theme={theme} className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
