import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { MatterPage } from '@/features/matters/MatterPage';

export const metadata: Metadata = { title: 'Matter' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MatterPage id={id} />
    </Suspense>
  );
}
