'use client';

import { Button, Icon, Skeleton } from '@lawfirm/ui-web';
import Link from 'next/link';
import { useSyncExternalStore, type ReactNode } from 'react';
import { ROUTE_META } from '@/lib/routes';

/** Content wrapper: the design's `cl-main` padding and 24px rhythm with the entrance animation. */
export function Page({
  children,
  className,
  style,
  wide,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  wide?: boolean;
}) {
  return (
    <div
      className={['cl-main', 'app-enter', className].filter(Boolean).join(' ')}
      style={{ maxWidth: wide ? 1440 : undefined, ...style }}
    >
      {children}
    </div>
  );
}

const SKEL_ROWS: [string, string][] = [
  ['32%', '12%'],
  ['44%', '10%'],
  ['28%', '14%'],
  ['38%', '9%'],
  ['50%', '12%'],
  ['30%', '11%'],
];

/** Skeleton page shown while the first queries resolve. */
export function PageSkeleton() {
  return (
    <div className="cl-main" style={{ gap: 20 }} aria-busy="true" aria-label="Loading">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="cl-stack cl-stack--sm">
          <Skeleton width={120} height={10} />
          <Skeleton width={260} height={22} />
        </div>
        <Skeleton width={120} height={36} />
      </div>
      <div className="cl-grid-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={86} style={{ borderRadius: 12 }} />
        ))}
      </div>
      <div className="cl-table-wrap" style={{ padding: '8px 0' }}>
        {SKEL_ROWS.map(([w1, w2], i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px' }}
          >
            <Skeleton width={28} height={28} circle />
            <Skeleton width={w1} height={12} />
            <Skeleton width={w2} height={12} style={{ marginLeft: 'auto' }} />
            <Skeleton width={72} height={22} style={{ borderRadius: 11 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-page error with a retry; never promises persistence that is not implemented. */
export function PageError({ routeKey, onRetry }: { routeKey: string; onRetry?: () => void }) {
  const meta = ROUTE_META[routeKey] ?? ROUTE_META.today!;
  return (
    <div
      className="cl-main app-enter"
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
          padding: '40px 32px',
          borderRadius: 16,
          background: 'var(--surface)',
          border: '1px solid var(--hairline)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              animation: 'cl-pulse-ring 2.4s ease-out infinite',
            }}
          />
          <span
            style={{
              position: 'relative',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              color: 'var(--danger-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alert" size="lg" />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="cl-t-title-2">{meta.title} didn’t load</div>
          <div className="cl-t-body-sm cl-muted" style={{ textWrap: 'pretty' }}>
            Please try loading this page again. Your last action may not have completed.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--surface-2)',
            font: 'var(--text-caption)',
            color: 'var(--ink-2)',
          }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning-dot)' }}
          />
          Unable to load this page
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="primary" icon="play" onClick={onRetry}>
            Try again
          </Button>
          <Link href="/today" className="cl-btn cl-btn--secondary">
            Back to Today
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Full-page empty state with the area's copy and one call to action. */
export function PageEmpty({ routeKey, action }: { routeKey: string; action?: ReactNode }) {
  const meta = ROUTE_META[routeKey] ?? ROUTE_META.today!;
  return (
    <div
      className="cl-main app-enter"
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
          padding: '40px 32px',
          borderRadius: 16,
          background: 'var(--surface)',
          border: '1px solid var(--hairline)',
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--accent-tint)',
            color: 'var(--accent-ink)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={meta.icon} size="lg" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="cl-t-title-2">{meta.emptyTitle}</div>
          <div className="cl-t-body-sm cl-muted" style={{ textWrap: 'pretty' }}>
            {meta.emptyText}
          </div>
        </div>
        {action ?? (
          <Link href="/today" className="cl-btn cl-btn--primary">
            {meta.emptyCta}
          </Link>
        )}
      </div>
    </div>
  );
}

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

/**
 * Wraps a page in the three states every area shares: skeleton while the
 * first queries load, the error page when any fails, the empty page when the
 * caller says there is nothing to show.
 */
export function QueryGate({
  queries,
  routeKey,
  empty,
  emptyAction,
  children,
}: {
  queries: QueryLike[];
  routeKey: string;
  empty?: boolean;
  emptyAction?: ReactNode;
  children: ReactNode;
}) {
  // Shell queries may resolve before a Suspense page hydrates. Its initial
  // markup must still match the server skeleton; cached navigation can render
  // immediately because useSyncExternalStore uses the client snapshot then.
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  if (!hydrated || queries.some((q) => q.isPending)) return <PageSkeleton />;
  if (queries.some((q) => q.isError)) {
    return (
      <PageError routeKey={routeKey} onRetry={() => queries.forEach((q) => void q.refetch())} />
    );
  }
  if (empty) return <PageEmpty routeKey={routeKey} action={emptyAction} />;
  return <>{children}</>;
}
