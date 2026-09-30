'use client';

import { ClepsoRoot } from '@lawfirm/ui-web';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { ThemeProvider, type ThemePreference } from '@/lib/theme';

export function Providers({ theme, children }: { theme: ThemePreference; children: ReactNode }) {
  return (
    <ThemeProvider initial={theme}>
      <QueryProvider>
        <ClepsoRoot density="web" style={{ minHeight: '100vh' }}>
          {children}
        </ClepsoRoot>
      </QueryProvider>
    </ThemeProvider>
  );
}
