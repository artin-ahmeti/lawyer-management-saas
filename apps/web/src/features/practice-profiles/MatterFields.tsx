'use client';
import { ApiError } from '@lawfirm/api-client';
import { Banner, Button, Card, Pill, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useLiveMatterClient } from '@/features/matters/use-live-matter-client';
import { displayValue } from './FieldValueInputs';
import { loadMatterFields } from './live-profiles';
import { MatterFieldsForm } from './MatterFieldsForm';
import styles from './PracticeProfiles.module.css';

/** The matter's pinned practice profile and its typed values; values follow the matter grant. */
export function MatterFields({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { client, context, firmId } = useLiveMatterClient();
  const [editing, setEditing] = useState(false),
    [saved, setSaved] = useState(false);
  const query = useQuery({
    queryKey: ['server-matter-fields', context, id],
    enabled: !!firmId,
    queryFn: ({ signal }) => loadMatterFields(client, id, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    // An open edit keeps the revision the user reviewed; reads refresh on focus otherwise.
    refetchOnWindowFocus: editing ? false : 'always',
  });
  const data = !query.isFetching && !query.isError ? query.data : undefined;
  const denied = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  const profile = data?.profile;
  const close = () => {
    setEditing(false);
    void query.refetch();
  };
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Practice profile</h2>}
      subtitle={
        profile
          ? `${profile.name} · version ${profile.version.version}. New versions of the profile do not change this matter.`
          : 'Typed fields from your firm’s practice profiles. No court or litigation detail is required.'
      }
      headerAction={
        !editing && (
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Refresh fields
          </Button>
        )
      }
    >
      {editing && firmId && query.data ? (
        <MatterFieldsForm
          client={client}
          context={context}
          firmId={firmId}
          fields={query.data}
          onCancel={close}
          onSaved={() => {
            setSaved(true);
            close();
            onChanged();
          }}
        />
      ) : query.isPending || query.isFetching ? (
        <div role="status" aria-label="Loading matter fields">
          <Skeleton height={100} />
        </div>
      ) : query.isError ? (
        <Banner
          role="alert"
          tone="warning"
          title={denied ? 'Matter fields unavailable' : 'Matter fields could not be loaded'}
          text="Refresh to check your current matter access."
          actions={<Button onClick={() => void query.refetch()}>Retry fields</Button>}
        />
      ) : (
        data && (
          <div className="cl-stack cl-stack--md">
            {saved && <Banner role="status" tone="success" title="Matter fields saved." />}
            {profile?.archived && (
              <div>
                <Pill tone="warning">Archived profile</Pill>
              </div>
            )}
            {!profile ? (
              <p role="status">No practice profile on this matter yet.</p>
            ) : !profile.version.fields.length ? (
              <p role="status">This profile version has no fields.</p>
            ) : (
              <dl className={styles.values}>
                {profile.version.fields.map((field) => (
                  <div key={field.key}>
                    <dt className="cl-muted">{field.label}</dt>
                    <dd>
                      {displayValue(
                        field,
                        Object.hasOwn(data.values, field.key) ? data.values[field.key] : undefined,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {data.canEdit && (
              <div className={styles.actions}>
                <Button
                  onClick={() => {
                    setSaved(false);
                    setEditing(true);
                  }}
                >
                  {profile ? 'Edit fields' : 'Add a practice profile'}
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </Card>
  );
}
