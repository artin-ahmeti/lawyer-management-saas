import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { MattersPage } from '@/features/matters/MattersPage';

export const metadata: Metadata = { title: 'Matters' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MattersPage />
    </Suspense>
  );
}
