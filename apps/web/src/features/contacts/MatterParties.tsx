'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import type { MatterPartyRecord } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useLiveMatterClient } from '@/features/matters/use-live-matter-client';
import { AddPartyForm } from './AddPartyForm';
import {
  loadMatterParties,
  preparePartyCommand,
  submitPartyCommand,
  type PartyCommand,
} from './live-contacts';
import { liveQuery } from './LiveContactsPage';
import { partyRoleLabel } from './party-labels';
import styles from './LiveContacts.module.css';

/** Parties on one matter: readable with any grant, changed only by matter managers. */
export function MatterParties({ id }: { id: string }) {
  const { client, context, firmId } = useLiveMatterClient();
  const [afterId, setAfterId] = useState<string>();
  const parties = useQuery({
    ...liveQuery,
    queryKey: ['server-matter-parties', context, id, afterId],
    enabled: !!firmId,
    queryFn: ({ signal }) => loadMatterParties(client, firmId!, id, signal, afterId),
  });
  const data = !parties.isFetching && !parties.isError ? parties.data : undefined;
  const denied =
    parties.error instanceof ApiError && [401, 403, 404].includes(parties.error.status);
  // Return to the first page after a change; that query key change fetches by itself.
  const changed = () => (afterId ? setAfterId(undefined) : void parties.refetch());
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Parties</h2>}
      subtitle="Clients, adverse parties and others on this matter. A contact can be a party to several matters."
      headerAction={
        <Button variant="secondary" onClick={() => void parties.refetch()}>
          Refresh parties
        </Button>
      }
    >
      {parties.isPending || parties.isFetching ? (
        <div role="status" aria-label="Loading parties">
          <Skeleton height={100} />
        </div>
      ) : parties.isError ? (
        <Banner
          role="alert"
          tone="warning"
          title={denied ? 'Parties unavailable' : 'Parties could not be loaded'}
          text="Refresh to check your current matter access."
          actions={<Button onClick={() => void parties.refetch()}>Retry parties</Button>}
        />
      ) : (
        data && (
          <div className="cl-stack cl-stack--md">
            {!data.items.length ? (
              <p role="status">{afterId ? 'No more parties.' : 'No parties recorded yet.'}</p>
            ) : (
              <ul className={styles.list} aria-label="Matter parties">
                {data.items.map((party) => (
                  <li key={party.id} className={`${styles.item} ${styles.row}`}>
                    <div className={styles.body}>
                      <Link href={`/contacts/${party.contactId}`} className="cl-t-title-3">
                        {party.contact.displayName}
                      </Link>
                      <p className="cl-muted">
                        {partyRoleLabel(party)} · since{' '}
                        {new Date(party.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {data.canManage && firmId && (
                      <EndParty client={client} firmId={firmId} party={party} onEnded={changed} />
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              {afterId && <Button onClick={() => setAfterId(undefined)}>First parties</Button>}
              {data.nextCursor && (
                <Button onClick={() => setAfterId(data.nextCursor!)}>Next parties</Button>
              )}
            </div>
          </div>
        )
      )}
      {/* The add form keeps its intent through transient list errors; confirmed denial removes it. */}
      {firmId && !denied && parties.data?.canManage && (
        <div hidden={!data}>
          <AddPartyForm
            client={client}
            context={context}
            firmId={firmId}
            matterId={id}
            onAdded={changed}
          />
        </div>
      )}
    </Card>
  );
}

function EndParty({
  client,
  firmId,
  party,
  onEnded,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  party: MatterPartyRecord;
  onEnded: () => void;
}) {
  const [intent, setIntent] = useState<PartyCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const end = async () => {
    if (running.current) return;
    const current =
      intent ??
      preparePartyCommand({ kind: 'end', matterId: party.matterId, input: { partyId: party.id } });
    setIntent(current);
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await submitPartyCommand(client, current, firmId);
      onEnded();
    } catch (e) {
      setError(
        e instanceof ApiError && [403, 404, 409].includes(e.status)
          ? 'This link changed. Refresh parties to review it.'
          : 'The result could not be confirmed. Check the same request.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="cl-stack cl-stack--sm">
      <Button
        variant="secondary"
        disabled={busy}
        aria-label={`End ${party.contact.displayName} as ${partyRoleLabel(party)}`}
        onClick={() => void end()}
      >
        {busy ? 'Ending link…' : intent ? 'Check ending' : 'End link'}
      </Button>
      {error && (
        <p role="alert" className="cl-muted">
          {error}
        </p>
      )}
    </div>
  );
}
