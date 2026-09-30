import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { InvoicePage } from '@/features/billing/InvoicePage';

export const metadata: Metadata = { title: 'Invoice' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoicePage id={id} />
    </Suspense>
  );
}
