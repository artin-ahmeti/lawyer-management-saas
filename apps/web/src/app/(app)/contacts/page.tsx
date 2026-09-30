import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { ContactsPage } from '@/features/contacts/ContactsPage';

export const metadata: Metadata = { title: 'Contacts' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContactsPage />
    </Suspense>
  );
}
