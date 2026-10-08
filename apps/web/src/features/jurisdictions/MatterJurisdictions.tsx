'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import type { MatterJurisdictionRecord } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useLiveMatterClient } from '@/features/matters/use-live-matter-client';
import { AddJurisdictionForm } from './AddJurisdictionForm';
import {
  loadMatterJurisdictions,
  prepareReferenceCommand,
  purposeLabel,
  referenceDetails,
  submitReferenceCommand,
  type ReferenceCommand,
} from './live-jurisdictions';
import styles from './Jurisdictions.module.css';

const live = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
};
const title = (r: MatterJurisdictionRecord) =>
  r.label ? `${purposeLabel(r.purpose)} · ${r.label}` : purposeLabel(r.purpose);

/** Jurisdiction references on one matter: readable with any grant, changed only by managers. */
export function MatterJurisdictions({ id }: { id: string }) {
  const { client, context, firmId } = useLiveMatterClient();
  const references = useQuery({
    ...live,
    queryKey: ['server-matter-jurisdictions', context, id],
    enabled: !!firmId,
    queryFn: ({ signal }) => loadMatterJurisdictions(client, firmId!, id, signal),
  });
  const data = !references.isFetching && !references.isError ? references.data : undefined;
  const denied =
    references.error instanceof ApiError && [401, 403, 404].includes(references.error.status);
  const changed = () => void references.refetch();
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Jurisdictions</h2>}
      subtitle="Governing law, venues and agencies for this matter. A matter can hold several, or none."
      headerAction={
        <Button variant="secondary" onClick={changed}>
          Refresh jurisdictions
        </Button>
      }
    >
      <div className="cl-stack cl-stack--md">
        <Banner
          tone="neutral"
          title="No jurisdiction-specific automation"
          text="Clepso does not yet calculate deadlines or apply court, agency or governing-law rules for these references. Record dates and requirements manually."
        />
        {references.isPending || references.isFetching ? (
          <div role="status" aria-label="Loading jurisdictions">
            <Skeleton height={100} />
          </div>
        ) : references.isError ? (
          <Banner
            role="alert"
            tone="warning"
            title={denied ? 'Jurisdictions unavailable' : 'Jurisdictions could not be loaded'}
            text="Refresh to check your current matter access."
            actions={<Button onClick={changed}>Retry jurisdictions</Button>}
          />
        ) : (
          data &&
          (!data.items.length ? (
            <p role="status">
              No jurisdictions recorded. Transactional and advisory matters may need none.
            </p>
          ) : (
            <ul className={styles.list} aria-label="Matter jurisdictions">
              {data.items.map((r) => (
                <li key={r.id} className={`${styles.item} ${styles.row}`}>
                  <div className={styles.body}>
                    <p className="cl-t-title-3">{title(r)}</p>
                    <p className="cl-muted">
                      {referenceDetails(r).join(' · ')} · since{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {data.canManage && firmId && (
                    <EndReference client={client} firmId={firmId} reference={r} onEnded={changed} />
                  )}
                </li>
              ))}
            </ul>
          ))
        )}
        {/* The add form keeps its intent through transient list errors; confirmed denial removes it. */}
        {firmId && !denied && references.data?.canManage && (
          <div hidden={!data}>
            <AddJurisdictionForm
              client={client}
              context={context}
              firmId={firmId}
              matterId={id}
              onAdded={changed}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function EndReference({
  client,
  firmId,
  reference,
  onEnded,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  reference: MatterJurisdictionRecord;
  onEnded: () => void;
}) {
  const [intent, setIntent] = useState<ReferenceCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const end = async () => {
    if (running.current) return;
    const current =
      intent ??
      prepareReferenceCommand({
        kind: 'end',
        matterId: reference.matterId,
        input: { referenceId: reference.id },
      });
    setIntent(current);
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await submitReferenceCommand(client, current, firmId);
      onEnded();
    } catch (e) {
      setError(
        e instanceof ApiError && [403, 404, 409].includes(e.status)
          ? 'This reference changed. Refresh jurisdictions to review it.'
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
        aria-label={`End ${title(reference)}: ${referenceDetails(reference).join(', ')}`}
        onClick={() => void end()}
      >
        {busy ? 'Ending…' : intent ? 'Check ending' : 'End reference'}
      </Button>
      {error && (
        <p role="alert" className="cl-muted">
          {error}
        </p>
      )}
    </div>
  );
}
