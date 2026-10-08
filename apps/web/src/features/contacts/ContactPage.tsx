'use client';
import { notFound } from 'next/navigation';
import { previewMode } from '@/lib/env';
import { LiveContactPage } from './LiveContactPage';

/** Preview keeps the fixture directory (its contacts open in a drawer); live staff get durable records. */
export function ContactPage({ id }: { id: string }) {
  if (previewMode) notFound();
  return <LiveContactPage id={id} />;
}
