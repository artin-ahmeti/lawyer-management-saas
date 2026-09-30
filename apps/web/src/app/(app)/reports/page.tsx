import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { ReportsPage } from '@/features/reports/ReportsPage';

export const metadata: Metadata = { title: 'Reports' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsPage />
    </Suspense>
  );
}
