'use client';
import { ApiError } from '@lawfirm/api-client';
import { uuidSchema } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Page } from '@/components/PageState';
import { useLiveMatterClient } from '@/features/matters/use-live-matter-client';
import { ContactForm } from './ContactForm';
import { loadContact, loadContactMatters } from './live-contacts';
import { liveQuery } from './LiveContactsPage';
import { partyRoleLabel } from './party-labels';
import styles from './LiveContacts.module.css';

export function LiveContactPage({ id }: { id: string }) {
  const { client, context, firmId } = useLiveMatterClient(),
    valid = uuidSchema.safeParse(id).success;
  const [editing, setEditing] = useState(false),
    [afterId, setAfterId] = useState<string>();
  const record = useQuery({
    ...liveQuery,
    queryKey: ['server-contacts', context, 'record', id],
    enabled: !!firmId && valid,
    queryFn: ({ signal }) => loadContact(client, firmId!, id, signal),
  });
  const matters = useQuery({
    ...liveQuery,
    queryKey: ['server-contacts', context, 'matters', id, afterId],
    enabled: !!firmId && valid,
    queryFn: ({ signal }) => loadContactMatters(client, id, signal, afterId),
  });
  const detail = !record.isFetching && !record.isError ? record.data : undefined;
  const denied = record.error instanceof ApiError && [401, 403, 404].includes(record.error.status);
  const reload = () => {
    void record.refetch();
    void matters.refetch();
  };
  const contact = detail?.contact;
  return (
    <Page>
      <div>
        <Link className="cl-btn cl-btn--secondary" href="/contacts">
          All contacts
        </Link>
      </div>
      <div className="cl-stack cl-stack--sm">
        <div className="cl-eyebrow">Contact</div>
        <h1 className="cl-t-title-1" style={{ overflowWrap: 'anywhere' }}>
          {contact?.displayName ?? 'Contact details'}
        </h1>
      </div>
      {!firmId || !valid || record.isError ? (
        <Banner
          role="alert"
          tone="warning"
          title={
            !valid || !firmId || denied
              ? 'This contact is unavailable'
              : 'Contact details could not be loaded'
          }
          text="The record may be unavailable or your access may have changed."
          actions={valid && firmId && <Button onClick={reload}>Retry contact</Button>}
        />
      ) : record.isPending || record.isFetching ? (
        <div role="status" aria-label="Loading contact">
          <Skeleton height={160} />
        </div>
      ) : (
        contact &&
        (editing ? (
          <ContactForm
            key={contact.revision}
            client={client}
            firmId={firmId}
            contact={contact}
            idPrefix="contact-edit"
            onCancel={() => {
              setEditing(false);
              reload();
            }}
            onSaved={() => {
              setEditing(false);
              reload();
            }}
          />
        ) : (
          <Card
            className={styles.card}
            title={<h2 className="cl-t-title-2">Contact details</h2>}
            headerAction={
              <div className={styles.actions}>
                {detail.canEdit && <Button onClick={() => setEditing(true)}>Edit contact</Button>}
                <Button variant="secondary" onClick={reload}>
                  Refresh contact
                </Button>
              </div>
            }
          >
            <dl className={`cl-stack cl-stack--sm ${styles.overview}`}>
              <div>
                <dt className="cl-muted">Type</dt>
                <dd>{contact.kind === 'person' ? 'Person' : 'Organization'}</dd>
              </div>
              <div>
                <dt className="cl-muted">Email</dt>
                <dd>{contact.email ?? 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="cl-muted">Phone</dt>
                <dd>{contact.phone ?? 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="cl-muted">Last updated</dt>
                <dd>
                  {new Date(contact.updatedAt).toLocaleString()} · revision {contact.revision}
                </dd>
              </div>
            </dl>
          </Card>
        ))
      )}
      {contact && !denied && (
        <Card
          className={styles.card}
          title={<h2 className="cl-t-title-2">Matters you can access</h2>}
          subtitle="Only matters where you hold current access are listed. Other matters are not shown or counted."
        >
          {matters.isPending || matters.isFetching ? (
            <div role="status" aria-label="Loading contact matters">
              <Skeleton height={80} />
            </div>
          ) : matters.isError ? (
            <Banner
              role="alert"
              tone="warning"
              title="Matters could not be loaded"
              actions={<Button onClick={() => void matters.refetch()}>Retry matters</Button>}
            />
          ) : !matters.data.items.length ? (
            <p role="status">No matters you can access list this contact.</p>
          ) : (
            <ul className={styles.list} aria-label="Contact matters">
              {matters.data.items.map((m) => (
                <li key={m.partyId} className={`${styles.item} ${styles.body}`}>
                  <Link href={`/matters/${m.matterId}`} className="cl-t-title-3">
                    {m.title}
                  </Link>
                  <p className="cl-muted">
                    {partyRoleLabel(m)}
                    {m.reference && ` · ${m.reference}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            {afterId && <Button onClick={() => setAfterId(undefined)}>First matters</Button>}
            {matters.data?.nextCursor && (
              <Button onClick={() => setAfterId(matters.data.nextCursor!)}>Next matters</Button>
            )}
          </div>
        </Card>
      )}
    </Page>
  );
}
