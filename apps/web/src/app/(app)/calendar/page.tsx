import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { CalendarPage } from '@/features/calendar/CalendarPage';

export const metadata: Metadata = { title: 'Calendar' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CalendarPage />
    </Suspense>
  );
}
