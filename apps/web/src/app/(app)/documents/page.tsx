import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { DocumentsPage } from '@/features/documents/DocumentsPage';

export const metadata: Metadata = { title: 'Documents' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsPage />
    </Suspense>
  );
}
