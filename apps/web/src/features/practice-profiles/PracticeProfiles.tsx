'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { practiceStarters, type PracticeProfileSummary } from '@lawfirm/core';
import { Banner, Button, Card, Pill, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { loadProfile, loadProfileList } from './live-profiles';
import { ProfileEditor } from './ProfileEditor';
import styles from './PracticeProfiles.module.css';

type Cursor = { afterName: string; afterId: string };
const live = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
};

/** Firm practice profiles: every live role reads them; owners and admins manage them. */
export function PracticeProfiles({
  client,
  context,
  firmId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
}) {
  const [status, setStatus] = useState<'active' | 'archived'>('active'),
    [cursor, setCursor] = useState<Cursor>(),
    [editing, setEditing] = useState<'new' | string>(),
    [saved, setSaved] = useState('');
  const list = useQuery({
    ...live,
    enabled: !editing,
    queryKey: ['server-practice-profiles', context, 'list', status, cursor],
    queryFn: ({ signal }) => loadProfileList(client, firmId, { status, ...cursor }, signal),
  });
  const detail = useQuery({
    ...live,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!editing && editing !== 'new',
    queryKey: ['server-practice-profiles', context, 'edit', editing],
    queryFn: ({ signal }) => loadProfile(client, firmId, editing!, signal),
  });
  const data = !list.isFetching && !list.isError ? list.data : undefined;
  const denied = list.error instanceof ApiError && [401, 403].includes(list.error.status);
  // Closing the editor returns focus to this card rather than dropping it on the page body.
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing)
      document.getElementById('practice-profiles-heading')?.focus();
    wasEditing.current = !!editing;
  }, [editing]);
  const show = (next: 'active' | 'archived') => {
    setStatus(next);
    setCursor(undefined);
  };
  if (editing)
    return editing === 'new' || detail.data ? (
      <ProfileEditor
        client={client}
        firmId={firmId}
        profile={editing === 'new' ? undefined : detail.data!.profile}
        onCancel={() => setEditing(undefined)}
        onSaved={(profile) => {
          setSaved(`${profile.name} saved as version ${profile.currentVersion.version}.`);
          setEditing(undefined);
          show(profile.archived ? 'archived' : 'active');
        }}
      />
    ) : (
      <Card className={styles.card} title={<h2 className="cl-t-title-2">Practice profiles</h2>}>
        {detail.isError ? (
          <Banner
            role="alert"
            tone="warning"
            title="This profile could not be loaded"
            actions={<Button onClick={() => setEditing(undefined)}>Back to profiles</Button>}
          />
        ) : (
          <div role="status" aria-label="Loading profile">
            <Skeleton height={120} />
          </div>
        )}
      </Card>
    );
  return (
    <Card
      className={styles.card}
      title={
        <h2 id="practice-profiles-heading" tabIndex={-1} className="cl-t-title-2">
          Practice profiles
        </h2>
      }
      subtitle="Practice areas and their matter fields. Each change to fields publishes a new version; existing matters keep theirs."
      headerAction={
        list.data?.canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setSaved('');
              setEditing('new');
            }}
          >
            New profile
          </Button>
        )
      }
    >
      <div className="cl-stack cl-stack--md">
        {saved && <Banner role="status" tone="success" title={saved} />}
        <div className={styles.actions} role="group" aria-label="Profile status">
          {(['active', 'archived'] as const).map((s) => (
            <Button
              key={s}
              variant={status === s ? 'primary' : 'secondary'}
              aria-pressed={status === s}
              onClick={() => show(s)}
            >
              {s === 'active' ? 'Active' : 'Archived'}
            </Button>
          ))}
        </div>
        {list.isPending || list.isFetching ? (
          <div role="status" aria-label="Loading practice profiles">
            <Skeleton height={100} />
          </div>
        ) : list.isError ? (
          <Banner
            role="alert"
            tone="warning"
            title={
              denied ? 'Practice profiles unavailable' : 'Practice profiles could not be loaded'
            }
            text="Refresh to check your current firm access."
            actions={<Button onClick={() => void list.refetch()}>Retry profiles</Button>}
          />
        ) : (
          data && (
            <>
              {!data.items.length ? (
                <p role="status">
                  {status === 'active'
                    ? data.canManage
                      ? 'No practice profiles yet. Create one from a blank form or a starter.'
                      : 'No practice profiles yet. Owners and admins can add them.'
                    : 'No archived profiles.'}
                </p>
              ) : (
                <ul className={styles.list} aria-label={`${status} practice profiles`}>
                  {data.items.map((p) => (
                    <ProfileRow
                      key={p.id}
                      profile={p}
                      canManage={data.canManage}
                      onEdit={() => {
                        setSaved('');
                        setEditing(p.id);
                      }}
                    />
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                {cursor && <Button onClick={() => setCursor(undefined)}>First profiles</Button>}
                {data.nextCursor && (
                  <Button onClick={() => setCursor(data.nextCursor!)}>Next profiles</Button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </Card>
  );
}

function ProfileRow({
  profile,
  canManage,
  onEdit,
}: {
  profile: PracticeProfileSummary;
  canManage: boolean;
  onEdit: () => void;
}) {
  const starter = profile.basedOn && practiceStarters[profile.basedOn.key];
  return (
    <li className={`${styles.item} ${styles.row}`}>
      <div className={styles.body}>
        <p className="cl-t-title-3">{profile.name}</p>
        <p className="cl-muted">
          Version {profile.currentVersion} · {profile.fieldCount} field
          {profile.fieldCount === 1 ? '' : 's'}
          {starter ? ` · from the ${starter.name} starter` : ' · custom'}
        </p>
        {profile.description && <p className="cl-muted">{profile.description}</p>}
      </div>
      <div className={styles.actions}>
        {profile.archived && <Pill tone="warning">Archived</Pill>}
        {canManage && (
          <Button variant="secondary" aria-label={`Edit ${profile.name}`} onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </li>
  );
}
