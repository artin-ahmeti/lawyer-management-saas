'use client';
import { ApiError } from '@lawfirm/api-client';
import { uuidSchema } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Page } from '@/components/PageState';
import { loadMatter } from './live-matters';
import { useLiveMatterClient } from './use-live-matter-client';
import styles from './LiveMatters.module.css';
import { MatterStaffAccess } from './MatterStaffAccess';
import { MatterParties } from '@/features/contacts/MatterParties';
import { MatterFields } from '@/features/practice-profiles/MatterFields';
import { MatterJurisdictions } from '@/features/jurisdictions/MatterJurisdictions';

export function LiveMatterPage({ id }: { id: string }) {
  const { client, context, firmId } = useLiveMatterClient(),
    valid = uuidSchema.safeParse(id).success;
  const query = useQuery({
    queryKey: ['server-matters', context, 'record', id],
    enabled: !!firmId && valid,
    queryFn: ({ signal }) => loadMatter(client, firmId!, id, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const matter = !query.isFetching && !query.isError ? query.data : undefined;
  const denied = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  const refreshMatter = () => {
    void query.refetch();
  };
  return (
    <Page>
      <div>
        <Link className="cl-btn cl-btn--secondary" href="/matters">
          All matters
        </Link>
      </div>
      <div className="cl-stack cl-stack--sm">
        <div className="cl-eyebrow">Matter</div>
        <h1 className="cl-t-title-1" style={{ overflowWrap: 'anywhere' }}>
          {matter?.title ?? 'Matter details'}
        </h1>
      </div>
      {!firmId || !valid || query.isError ? (
        <Banner
          role="alert"
          tone="warning"
          title={
            !valid || !firmId || denied
              ? 'This matter is unavailable'
              : 'Matter details could not be loaded'
          }
          text="The record may be unavailable or your access may have changed."
          actions={
            valid && firmId && <Button onClick={() => void query.refetch()}>Retry matter</Button>
          }
        />
      ) : query.isPending || query.isFetching ? (
        <div role="status" aria-label="Loading matter">
          <Skeleton height={160} />
        </div>
      ) : (
        matter && (
          <>
            <Card
              className={styles.card}
              title={<h2 className="cl-t-title-2">Matter overview</h2>}
              headerAction={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Refresh matter
                </Button>
              }
            >
              <dl className={`cl-stack cl-stack--sm ${styles.overview}`}>
                <div>
                  <dt className="cl-muted">Reference</dt>
                  <dd>{matter.reference ?? 'No reference'}</dd>
                </div>
                <div>
                  <dt className="cl-muted">Practice profile</dt>
                  <dd>
                    {matter.profile
                      ? `${matter.profile.name} · version ${matter.profile.version}`
                      : 'None'}
                  </dd>
                </div>
                <div>
                  <dt className="cl-muted">Your access</dt>
                  <dd>{matter.accessRole === 'manager' ? 'Matter manager' : 'Read access'}</dd>
                </div>
                <div>
                  <dt className="cl-muted">Created</dt>
                  <dd>{new Date(matter.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </Card>
            <Card
              className={styles.card}
              title={<h2 className="cl-t-title-2">Matter workspace</h2>}
              subtitle="Documents, tasks and billing will become available as those services are connected."
            />
          </>
        )
      )}
      {/* Panels with forms stay mounted while the matter refetches, so typed input survives. */}
      {query.data && !denied && (
        <>
          <div hidden={!matter}>
            <MatterFields key={`${id}:fields`} id={id} onChanged={refreshMatter} />
          </div>
          <div hidden={!matter}>
            <MatterParties key={id} id={id} />
          </div>
          <div hidden={!matter}>
            <MatterJurisdictions key={`${id}:jurisdictions`} id={id} />
          </div>
        </>
      )}
      {query.data?.accessRole === 'manager' && !denied && (
        <div hidden={!matter}>
          <MatterStaffAccess key={id} id={id} onChanged={refreshMatter} />
        </div>
      )}
    </Page>
  );
}
