import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { TrustPage } from '@/features/trust/TrustPage';

export const metadata: Metadata = { title: 'Trust' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TrustPage />
    </Suspense>
  );
}
