'use client';
import { ApiError, type ContactListQuery } from '@lawfirm/api-client';
import { Banner, Button, Card, Field, Input, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Page } from '@/components/PageState';
import { useLiveMatterClient } from '@/features/matters/use-live-matter-client';
import { ContactForm } from './ContactForm';
import { loadContactList } from './live-contacts';
import styles from './LiveContacts.module.css';

export const liveQuery = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
};

export function LiveContactsPage() {
  const { client, context, firmId } = useLiveMatterClient(),
    router = useRouter();
  const [creating, setCreating] = useState(false),
    [draft, setDraft] = useState(''),
    [query, setQuery] = useState<ContactListQuery>({});
  const list = useQuery({
    ...liveQuery,
    queryKey: ['server-contacts', context, 'list', query],
    enabled: !!firmId,
    queryFn: ({ signal }) => loadContactList(client, firmId!, query, signal),
  });
  const data = !list.isFetching && !list.isError ? list.data : undefined;
  const denied = list.error instanceof ApiError && [401, 403].includes(list.error.status);
  const search = (q: string) => setQuery(q.trim() ? { q: q.trim() } : {});
  return (
    <Page>
      <div className={styles.row}>
        <div>
          <div className="cl-eyebrow">Directory</div>
          <h1 className="cl-t-title-1">Contacts</h1>
        </div>
        {data?.canEdit && !creating && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            New contact
          </Button>
        )}
      </div>
      {creating && firmId && !denied && (
        <ContactForm
          client={client}
          firmId={firmId}
          onCancel={() => {
            setCreating(false);
            void list.refetch();
          }}
          onSaved={(contact) => router.push(`/contacts/${contact.id}`)}
        />
      )}
      {!firmId ? (
        <Banner tone="warning" title="Select a workspace in Settings to load contacts." />
      ) : (
        <Card
          className={styles.card}
          title={<h2 className="cl-t-title-2">Firm directory</h2>}
          subtitle="People and organizations your firm works with. Matter links appear only where you have matter access."
          headerAction={
            <Button variant="secondary" onClick={() => void list.refetch()}>
              Refresh contacts
            </Button>
          }
        >
          <form
            role="search"
            className={styles.search}
            onSubmit={(e) => {
              e.preventDefault();
              search(draft);
            }}
          >
            <Field label={<span id="contact-search-label">Search by name</span>}>
              <Input
                type="search"
                aria-labelledby="contact-search-label"
                value={draft}
                maxLength={100}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Field>
            <Button type="submit">Search</Button>
            {query.q && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft('');
                  search('');
                }}
              >
                Clear search
              </Button>
            )}
          </form>
          {list.isFetching || list.isPending ? (
            <div role="status" aria-label="Loading contacts">
              <Skeleton height={160} />
            </div>
          ) : list.isError ? (
            <Banner
              role="alert"
              tone="warning"
              title={denied ? 'Contact directory unavailable' : 'Contacts could not be loaded'}
              text="Refresh to check your current workspace access."
              actions={<Button onClick={() => void list.refetch()}>Retry contacts</Button>}
            />
          ) : (
            data && (
              <>
                {!data.items.length ? (
                  <div role="status">
                    <p>
                      {query.q
                        ? `No contacts match “${query.q}”.`
                        : query.afterId
                          ? 'No more contacts.'
                          : 'No contacts yet.'}
                    </p>
                    {data.canEdit && !query.q && (
                      <p className="cl-muted">Create the first contact for your firm.</p>
                    )}
                  </div>
                ) : (
                  <ul className={styles.list} aria-label="Firm contacts">
                    {data.items.map((c) => (
                      <li key={c.id} className={`${styles.item} ${styles.body}`}>
                        <Link href={`/contacts/${c.id}`} className="cl-t-title-3">
                          {c.displayName}
                        </Link>
                        <p className="cl-muted">
                          {c.kind === 'person' ? 'Person' : 'Organization'}
                          {c.email && ` · ${c.email}`}
                          {c.phone && ` · ${c.phone}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.actions}>
                  {query.afterId && (
                    <Button
                      variant="secondary"
                      onClick={() => setQuery(query.q ? { q: query.q } : {})}
                    >
                      First contacts
                    </Button>
                  )}
                  {data.nextCursor && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setQuery({ ...(query.q ? { q: query.q } : {}), ...data.nextCursor! })
                      }
                    >
                      Next contacts
                    </Button>
                  )}
                </div>
              </>
            )
          )}
        </Card>
      )}
    </Page>
  );
}
