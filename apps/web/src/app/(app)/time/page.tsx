import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { TimePage } from '@/features/time/TimePage';

export const metadata: Metadata = { title: 'Time' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TimePage />
    </Suspense>
  );
}
