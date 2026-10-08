'use client';
import type { createApiClient } from '@lawfirm/api-client';
import { type InvitationCursor } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { loadInvitations, type InvitationIntent } from './staff-invitations';
import { InvitationAction } from './InvitationAction';
import { InvitationForm, invitationRoleLabels } from './InvitationForm';
import styles from './StaffInvitations.module.css';

export function StaffInvitations({
  client,
  context,
  userId,
  firmId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  userId: string;
  firmId?: string;
}) {
  const [cursor, setCursor] = useState<Required<InvitationCursor> | null>(null),
    [intent, setIntent] = useState<InvitationIntent>();
  const scope = firmId
    ? { kind: 'managed' as const, firmId }
    : { kind: 'received' as const, userId };
  const query = useQuery({
    queryKey: ['server-firm', context, 'invitations', scope.kind, firmId, cursor],
    queryFn: ({ signal }) => loadInvitations(client, scope, cursor, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const reload = () => {
    setIntent(undefined);
    setCursor(null);
    void query.refetch();
  };
  type Review =
    | {
        kind: 'prepare';
        firmId: string;
        input: { email: string; role: 'admin' | 'attorney' | 'paralegal' | 'billing' | 'readonly' };
      }
    | {
        kind: 'accept' | 'revoke';
        firmId: string;
        invitationId: string;
        input: { expectedRevision: number };
      };
  const review = (action: Review) =>
    setIntent({ ...action, idempotencyKey: crypto.randomUUID(), requestId: crypto.randomUUID() });
  let content;
  if (query.isFetching || query.isPending)
    content = (
      <div role="status" aria-label="Loading staff invitations">
        <Skeleton height={120} />
      </div>
    );
  else if (query.isError)
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Invitations did not load"
        text="Previous invitations are hidden. Check your connection and try again."
      />
    );
  else if (query.data.kind === 'denied')
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Invitation access unavailable"
        text="Confirm your account email or ask your administrator to check your current access."
      />
    );
  else
    content = (
      <>
        {query.data.page.items.length === 0 ? (
          <p role="status">
            {firmId
              ? 'No staff invitations yet.'
              : 'No pending invitations for your confirmed email.'}
          </p>
        ) : (
          <ul
            className={styles.list}
            aria-label={firmId ? 'Firm invitations' : 'Received invitations'}
          >
            {query.data.page.items.map((item) => (
              <li key={item.id} className={styles.row}>
                <div className={styles.details}>
                  <strong>{'email' in item ? item.email : item.firmName}</strong>
                  <p>
                    {invitationRoleLabels[item.role]} · {item.status}
                  </p>
                  <p>Expires {new Date(item.expiresAt).toLocaleString()}</p>
                </div>
                {(!firmId || item.status === 'pending' || item.status === 'expired') && (
                  <Button
                    className={styles.control}
                    variant="secondary"
                    disabled={Boolean(intent)}
                    onClick={() =>
                      review({
                        kind: firmId ? 'revoke' : 'accept',
                        firmId: item.firmId,
                        invitationId: item.id,
                        input: { expectedRevision: item.revision },
                      })
                    }
                  >
                    {firmId ? 'Review revocation' : 'Review invitation'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.controls}>
          {cursor && (
            <Button
              className={styles.control}
              disabled={Boolean(intent)}
              variant="secondary"
              onClick={() => setCursor(null)}
            >
              Newest invitations
            </Button>
          )}
          {query.data.page.nextCursor && (
            <Button
              className={styles.control}
              disabled={Boolean(intent)}
              variant="secondary"
              onClick={() =>
                setCursor(query.data.kind === 'available' ? query.data.page.nextCursor : null)
              }
            >
              Older invitations
            </Button>
          )}
        </div>
      </>
    );
  const canPrepare = Boolean(
    firmId && !query.isFetching && !query.isError && query.data?.kind === 'available',
  );
  return (
    <section aria-label={firmId ? 'Manage staff invitations' : 'Invitations for your account'}>
      <Card
        className={styles.panel}
        title={<h2 className="cl-t-title-3">{firmId ? 'Staff invitations' : 'Join a firm'}</h2>}
        subtitle={
          firmId
            ? 'Prepare access for a confirmed account. Invitations expire after seven days.'
            : 'Only invitations addressed to your current confirmed email appear here.'
        }
        headerAction={
          <Button
            className={styles.control}
            disabled={query.isFetching || Boolean(intent)}
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            Refresh {firmId ? 'staff' : 'received'} invitations
          </Button>
        }
      >
        <div className="cl-stack cl-stack--md">
          {content}
          {firmId && (
            <p className={styles.note}>
              Email delivery is unavailable. Ask the recipient to sign in and review their
              invitation in Settings.
            </p>
          )}
          {canPrepare && firmId && !intent && (
            <InvitationForm onReview={(input) => review({ kind: 'prepare', firmId, input })} />
          )}
          {intent && (
            <InvitationAction
              key={intent.idempotencyKey}
              intent={intent}
              client={client}
              userId={userId}
              context={context}
              onDone={reload}
              onDenied={() => void query.refetch()}
            />
          )}
        </div>
      </Card>
    </section>
  );
}
