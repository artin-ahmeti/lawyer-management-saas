import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageState';
import { TasksPage } from '@/features/tasks/TasksPage';

export const metadata: Metadata = { title: 'Tasks' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksPage />
    </Suspense>
  );
}
