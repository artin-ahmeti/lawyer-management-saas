'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { jurisdictionName, type ForumRecord, type JurisdictionCode } from '@lawfirm/core';
import { Banner, Button, Card, Field, Input, Pill, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ForumForm } from './ForumForm';
import { JurisdictionSelect } from './JurisdictionSelect';
import {
  forumChanges,
  forumKindLabel,
  loadForumList,
  prepareForumCommand,
  submitForumCommand,
  type ForumCommand,
} from './live-jurisdictions';
import styles from './Jurisdictions.module.css';

type Cursor = { afterName: string; afterId: string };
const live = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
};

/** Firm forums: every live role reads them; owners and admins rename and archive them. */
export function Forums({
  client,
  context,
  firmId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
}) {
  const [status, setStatus] = useState<'active' | 'archived'>('active'),
    [jurisdiction, setJurisdiction] = useState(''),
    [cursor, setCursor] = useState<Cursor>(),
    [adding, setAdding] = useState(false),
    [saved, setSaved] = useState('');
  const list = useQuery({
    ...live,
    queryKey: ['server-forums', context, 'list', status, jurisdiction, cursor],
    queryFn: ({ signal }) =>
      loadForumList(client, firmId, { status, jurisdiction, ...cursor }, signal),
  });
  const data = !list.isFetching && !list.isError ? list.data : undefined;
  const denied = list.error instanceof ApiError && [401, 403].includes(list.error.status);
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !adding) document.getElementById('forums-heading')?.focus();
    wasAdding.current = adding;
  }, [adding]);
  const show = (next: 'active' | 'archived') => {
    setStatus(next);
    setCursor(undefined);
  };
  const changed = (message: string) => {
    setSaved(message);
    if (cursor) setCursor(undefined);
    else void list.refetch();
  };
  return (
    <Card
      className={styles.card}
      title={
        <h2 id="forums-heading" tabIndex={-1} className="cl-t-title-2">
          Courts and agencies
        </h2>
      }
      subtitle="Courts, agencies and tribunals your matters refer to. Archived forums stay on the matters that already name them."
      headerAction={
        list.data?.canCreate &&
        !adding && (
          <Button
            variant="primary"
            onClick={() => {
              setSaved('');
              setAdding(true);
            }}
          >
            Add forum
          </Button>
        )
      }
    >
      <div className="cl-stack cl-stack--md">
        {adding && (
          <ForumForm
            client={client}
            firmId={firmId}
            idPrefix="settings-forum"
            onCancel={() => setAdding(false)}
            onSaved={(forum) => {
              setAdding(false);
              show('active');
              changed(`${forum.name} added.`);
            }}
          />
        )}
        {saved && <Banner role="status" tone="success" title={saved} />}
        <div className={styles.row}>
          <div className={styles.actions} role="group" aria-label="Forum status">
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
          <Field label={<span id="forum-filter-label">Jurisdiction</span>}>
            <JurisdictionSelect
              labelledBy="forum-filter-label"
              value={jurisdiction}
              placeholder="All jurisdictions"
              onChange={(code) => {
                setJurisdiction(code);
                setCursor(undefined);
              }}
            />
          </Field>
        </div>
        {list.isPending || list.isFetching ? (
          <div role="status" aria-label="Loading forums">
            <Skeleton height={100} />
          </div>
        ) : list.isError ? (
          <Banner
            role="alert"
            tone="warning"
            title={denied ? 'Forums unavailable' : 'Forums could not be loaded'}
            text="Refresh to check your current firm access."
            actions={<Button onClick={() => void list.refetch()}>Retry forums</Button>}
          />
        ) : (
          data && (
            <>
              {!data.items.length ? (
                <p role="status">
                  {status === 'archived'
                    ? 'No archived forums.'
                    : jurisdiction
                      ? `No active forums in ${jurisdictionName(jurisdiction as JurisdictionCode)}.`
                      : data.canCreate
                        ? 'No forums yet. Add the courts and agencies your matters appear before.'
                        : 'No forums yet.'}
                </p>
              ) : (
                <ul className={styles.list} aria-label={`${status} forums`}>
                  {data.items.map((f) => (
                    <ForumRow
                      key={`${f.id}:${f.revision}`}
                      client={client}
                      firmId={firmId}
                      forum={f}
                      canManage={data.canManage}
                      onChanged={changed}
                    />
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                {cursor && <Button onClick={() => setCursor(undefined)}>First forums</Button>}
                {data.nextCursor && (
                  <Button onClick={() => setCursor(data.nextCursor!)}>Next forums</Button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </Card>
  );
}

/** Rename or archive one forum against the loaded revision; one intent per change. */
function ForumRow({
  client,
  firmId,
  forum,
  canManage,
  onChanged,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  forum: ForumRecord;
  canManage: boolean;
  onChanged: (message: string) => void;
}) {
  const [renaming, setRenaming] = useState(false),
    [name, setName] = useState(forum.name);
  const [intent, setIntent] = useState<ForumCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const run = async (form: { name: string; archived: boolean }) => {
    if (running.current) return;
    let current = intent;
    if (!current) {
      let changes;
      try {
        changes = forumChanges(forum, form);
      } catch {
        setError('Enter a name of up to 200 characters.');
        return;
      }
      if (!changes) return setRenaming(false);
      current = prepareForumCommand({ kind: 'update', forumId: forum.id, input: changes });
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const { forum: next } = await submitForumCommand(client, current, firmId);
      onChanged(
        next.archived !== forum.archived
          ? `${next.name} ${next.archived ? 'archived' : 'restored'}.`
          : `Renamed to ${next.name}.`,
      );
    } catch (e) {
      // A name clash is recoverable: the next attempt is a new intent with another name.
      if (e instanceof ApiError && e.code === 'FORUM_NAME_TAKEN') setIntent(undefined);
      setError(
        e instanceof ApiError && e.code === 'FORUM_NAME_TAKEN'
          ? 'An active forum in this jurisdiction already uses this name.'
          : e instanceof ApiError && [403, 404, 409, 422].includes(e.status)
            ? 'This forum changed or is unavailable. Refresh forums to review it.'
            : 'The result could not be confirmed. Check the same request.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const label = `${forumKindLabel(forum.kind)} · ${jurisdictionName(forum.jurisdiction)}`;
  return (
    <li className={`${styles.item} cl-stack cl-stack--sm`}>
      <div className={styles.row}>
        <div className={styles.body}>
          <p className="cl-t-title-3">{forum.name}</p>
          <p className="cl-muted">{label}</p>
        </div>
        <div className={styles.actions}>
          {forum.archived && <Pill tone="warning">Archived</Pill>}
          {canManage && !renaming && (
            <>
              {!forum.archived && (
                <Button
                  variant="secondary"
                  disabled={busy || !!intent}
                  aria-label={`Rename ${forum.name}`}
                  onClick={() => setRenaming(true)}
                >
                  Rename
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={busy}
                aria-label={`${forum.archived ? 'Restore' : 'Archive'} ${forum.name}`}
                onClick={() => void run({ name: forum.name, archived: !forum.archived })}
              >
                {busy
                  ? 'Saving…'
                  : intent
                    ? 'Check change'
                    : forum.archived
                      ? 'Restore'
                      : 'Archive'}
              </Button>
            </>
          )}
        </div>
      </div>
      {renaming && (
        <form
          className={styles.row}
          aria-busy={busy}
          onSubmit={(e) => {
            e.preventDefault();
            void run({ name, archived: forum.archived });
          }}
        >
          <Field label={<span id={`forum-${forum.id}-name`}>New name</span>}>
            <Input
              aria-labelledby={`forum-${forum.id}-name`}
              value={name}
              maxLength={200}
              required
              disabled={!!intent}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : intent ? 'Check rename' : 'Save name'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setRenaming(false);
                setIntent(undefined);
                setName(forum.name);
                setError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="cl-muted">
          {error}
        </p>
      )}
    </li>
  );
}
