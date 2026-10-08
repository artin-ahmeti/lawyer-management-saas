import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { ContactPage } from '@/features/contacts/ContactPage';

export const metadata: Metadata = { title: 'Contact' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContactPage id={id} />
    </Suspense>
  );
}
