import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPage } from '@/features/auth/AuthPage';
export const metadata: Metadata = { title: 'Sign up' };
export default function Page() {
  return (
    <Suspense>
      <AuthPage mode="sign-up" />
    </Suspense>
  );
}
