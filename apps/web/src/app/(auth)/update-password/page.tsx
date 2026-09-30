import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPage } from '@/features/auth/AuthPage';
export const metadata: Metadata = { title: 'Update password' };
export default function Page() {
  return (
    <Suspense>
      <AuthPage mode="update-password" />
    </Suspense>
  );
}
