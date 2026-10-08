import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AppFrame } from '@/components/shell/AppFrame';
import { SidebarProvider } from '@/lib/sidebar';
import { readSidebarCookie, SIDEBAR_COOKIE } from '@/lib/sidebar-cookie';
import { StaffSessionBoundary } from '@/features/auth/StaffSessionBoundary';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sidebar = readSidebarCookie((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
    <SidebarProvider initial={sidebar}>
      <StaffSessionBoundary>
        <AppFrame>{children}</AppFrame>
      </StaffSessionBoundary>
    </SidebarProvider>
  );
}
