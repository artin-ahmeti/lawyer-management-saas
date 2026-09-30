import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { InboxPage } from '@/features/inbox/InboxPage';

export const metadata: Metadata = { title: 'Inbox' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InboxPage />
    </Suspense>
  );
}
