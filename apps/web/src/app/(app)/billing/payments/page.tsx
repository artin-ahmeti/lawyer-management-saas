import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { BillingPage } from '@/features/billing/BillingPage';

export const metadata: Metadata = { title: 'Payments' };
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BillingPage tab="payments" />
    </Suspense>
  );
}
