import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const metadata: Metadata = { title: 'Settings' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}
