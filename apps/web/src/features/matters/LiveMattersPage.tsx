'use client';
import { ApiError } from '@lawfirm/api-client';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Page } from '@/components/PageState';
import { loadMatterList } from './live-matters';
import { useLiveMatterClient } from './use-live-matter-client';
import { CreateMatterForm } from './CreateMatterForm';
import styles from './LiveMatters.module.css';

export function LiveMattersPage() {
  const { client, context, firmId } = useLiveMatterClient(),
    router = useRouter();
  const [creating, setCreating] = useState(false),
    [afterId, setAfterId] = useState<string>();
  const query = useQuery({
    queryKey: ['server-matters', context, 'list', afterId],
    enabled: !!firmId,
    queryFn: ({ signal }) => loadMatterList(client, firmId!, signal, afterId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const data = !query.isFetching && !query.isError ? query.data : undefined;
  const denied = query.error instanceof ApiError && [401, 403].includes(query.error.status);
  const refresh = () => {
    void query.refetch();
  };
  const closeCreation = () => {
    setCreating(false);
    refresh();
  };
  return (
    <Page>
      <div className={styles.row}>
        <div>
          <div className="cl-eyebrow">Workspace</div>
          <h1 className="cl-t-title-1">Matters</h1>
        </div>
        {data?.canCreate && !creating && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            New matter
          </Button>
        )}
      </div>
      {creating && firmId && !denied && data?.canCreate !== false && (
        <div hidden={!data?.canCreate}>
          <CreateMatterForm
            client={client}
            firmId={firmId}
            onCancel={closeCreation}
            onSaved={(id) => router.push(`/matters/${id}`)}
          />
        </div>
      )}
      {!firmId ? (
        <Banner tone="warning" title="Select a workspace in Settings to load matters." />
      ) : query.isFetching || query.isPending ? (
        <div role="status" aria-label="Loading matters">
          <Skeleton height={160} />
        </div>
      ) : query.isError ? (
        <Banner
          role="alert"
          tone="warning"
          title={denied ? 'Matter access unavailable' : 'Matters could not be loaded'}
          text="Refresh to check your current workspace access."
          actions={<Button onClick={() => void query.refetch()}>Retry matters</Button>}
        />
      ) : (
        data && (
          <>
            <Card
              className={styles.card}
              title={<h2 className="cl-t-title-2">Matters visible to you</h2>}
              subtitle="Only matters with a current access grant appear here."
              headerAction={
                <Button variant="secondary" onClick={refresh}>
                  Refresh matters
                </Button>
              }
            >
              {!data.items.length ? (
                <div role="status">
                  <p>{afterId ? 'No more accessible matters.' : 'No accessible matters yet.'}</p>
                  <p className="cl-muted">Create a matter or ask your firm to arrange access.</p>
                </div>
              ) : (
                <ul className={styles.list} aria-label="Accessible matters">
                  {data.items.map((m) => (
                    <li key={m.id} className={`${styles.row} ${styles.item}`}>
                      <div className={styles.body}>
                        <Link href={`/matters/${m.id}`} className="cl-t-title-3">
                          {m.title}
                        </Link>
                        <p className="cl-muted">
                          {m.reference ?? 'No reference'} ·{' '}
                          {m.accessRole === 'manager' ? 'Matter manager' : 'Read access'}
                        </p>
                      </div>
                      <Link
                        className="cl-btn cl-btn--secondary"
                        href={`/matters/${m.id}`}
                        aria-label={`Open ${m.title}`}
                      >
                        Open matter
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                {afterId && (
                  <Button variant="secondary" onClick={() => setAfterId(undefined)}>
                    First page
                  </Button>
                )}
                {data.nextCursor && (
                  <Button variant="secondary" onClick={() => setAfterId(data.nextCursor!)}>
                    Next matters
                  </Button>
                )}
              </div>
            </Card>
          </>
        )
      )}
    </Page>
  );
}
