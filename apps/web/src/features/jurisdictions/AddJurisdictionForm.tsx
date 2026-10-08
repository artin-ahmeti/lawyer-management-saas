'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  matterJurisdictionHistoryLimit,
  matterJurisdictionLimit,
  type ForumKind,
  type ForumRecord,
  type JurisdictionPurpose,
} from '@lawfirm/core';
import { Banner, Button, Field, Input } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ForumForm } from './ForumForm';
import { JurisdictionSelect } from './JurisdictionSelect';
import {
  emptyReferenceForm,
  jurisdictionFilter,
  loadForumList,
  prepareReferenceCommand,
  purposes,
  referenceInput,
  submitReferenceCommand,
  type ReferenceCommand,
  type ReferenceForm,
} from './live-jurisdictions';
import styles from './Jurisdictions.module.css';

type Cursor = { afterName: string; afterId: string };
const live = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: false as const,
};
const kindFor: Record<JurisdictionPurpose, ForumKind> = {
  governing_law: 'other',
  venue: 'court',
  agency: 'agency',
  other: 'other',
};
const messages: Record<string, string> = {
  REFERENCE_EXISTS: 'This matter already holds this reference.',
  REFERENCE_LIMIT: `This matter already holds ${matterJurisdictionLimit} jurisdiction references. End one first.`,
  REFERENCE_HISTORY_LIMIT: `This matter has recorded ${matterJurisdictionHistoryLimit} jurisdiction references. Contact your administrator.`,
  FORUM_ARCHIVED: 'That forum was archived. Choose an active forum.',
  FORUM_UNAVAILABLE: 'That forum is no longer available. Choose another.',
  FORUM_JURISDICTION_MISMATCH: 'That forum belongs to another jurisdiction.',
};

/** Record one reference. A forum is optional; a new one can be added in place. */
export function AddJurisdictionForm({
  client,
  context,
  firmId,
  matterId,
  onAdded,
  onDirty,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  matterId: string;
  onAdded: () => void;
  /** True while there is typed input or an unconfirmed request, so the panel holds still. */
  onDirty: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState<ReferenceForm>(emptyReferenceForm),
    [cursor, setCursor] = useState<Cursor>(),
    [created, setCreated] = useState<ForumRecord>(),
    [creating, setCreating] = useState(false);
  const [intent, setIntent] = useState<ReferenceCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const dirty =
    !!intent ||
    creating ||
    (Object.keys(form) as (keyof ReferenceForm)[]).some((k) => form[k] !== emptyReferenceForm[k]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const law = form.purpose === 'governing_law';
  const forums = useQuery({
    ...live,
    enabled: !law && !!form.jurisdiction,
    queryKey: ['server-forums', context, 'reference', form.jurisdiction, cursor],
    queryFn: ({ signal }) =>
      loadForumList(
        client,
        firmId,
        { status: 'active', jurisdiction: jurisdictionFilter(form.jurisdiction), ...cursor },
        signal,
      ),
  });
  const options = [
    ...(created && created.jurisdiction === form.jurisdiction ? [created] : []),
    ...(forums.data?.items ?? []).filter((f) => f.id !== created?.id),
  ];
  const set = (patch: Partial<ReferenceForm>) => setForm((f) => ({ ...f, ...patch }));
  // A choice from another page would be hidden by the select, so paging clears it.
  const page = (next?: Cursor) => {
    setCursor(next);
    if (form.forumId !== created?.id) set({ forumId: '' });
  };
  /** After the inline forum form closes, focus returns to the forum picker it replaced. */
  const refocus = () =>
    requestAnimationFrame(() =>
      (
        document.querySelector('[aria-labelledby="reference-forum-label"]') as HTMLElement | null
      )?.focus(),
    );
  const reset = () => {
    setForm(emptyReferenceForm);
    setIntent(undefined);
    setTerminal(false);
    setCreated(undefined);
    setCursor(undefined);
  };
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      const input = referenceInput(form);
      if (!input) {
        setError(
          form.purpose === 'other'
            ? 'Choose a jurisdiction and describe the reference in up to 80 characters.'
            : 'Choose a jurisdiction. Docket numbers are up to 100 characters.',
        );
        return;
      }
      current = prepareReferenceCommand({ kind: 'add', matterId, input });
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await submitReferenceCommand(client, current, firmId);
      if (!active.current) return;
      reset();
      onAdded();
    } catch (e) {
      if (!active.current) return;
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        (e instanceof ApiError && e.code && messages[e.code]) ||
          (final
            ? 'The reference could not be added. Refresh the matter to review current access.'
            : 'The result could not be confirmed. Check the same request to recover it safely.'),
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  if (creating)
    return (
      <ForumForm
        client={client}
        firmId={firmId}
        idPrefix="reference-forum"
        jurisdiction={form.jurisdiction}
        defaultKind={kindFor[form.purpose]}
        onCancel={() => {
          setCreating(false);
          void forums.refetch();
          refocus();
        }}
        onNameTaken={() => void forums.refetch()}
        onSaved={(forum) => {
          setCreated(forum);
          set({ forumId: forum.id });
          setCreating(false);
          refocus();
        }}
      />
    );
  const help = purposes.find((p) => p.value === form.purpose)!.help;
  return (
    <form
      className="cl-stack cl-stack--md"
      aria-labelledby="add-jurisdiction-heading"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h3 id="add-jurisdiction-heading" className="cl-t-title-3">
        Add a jurisdiction
      </h3>
      <fieldset className={`${styles.grid} ${styles.subform}`} disabled={!!intent}>
        <legend className="cl-muted">Reference</legend>
        <Field label={<span id="reference-purpose-label">Purpose</span>} help={help}>
          <select
            aria-labelledby="reference-purpose-label"
            className={`cl-input ${styles.select}`}
            value={form.purpose}
            onChange={(e) => set({ purpose: e.target.value as JurisdictionPurpose })}
          >
            {purposes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<span id="reference-jurisdiction-label">Jurisdiction</span>}>
          <JurisdictionSelect
            labelledBy="reference-jurisdiction-label"
            value={form.jurisdiction}
            onChange={(code) => {
              set({ jurisdiction: code, forumId: '' });
              setCursor(undefined);
            }}
          />
        </Field>
        {form.purpose === 'other' && (
          <Field label={<span id="reference-label-label">Description</span>}>
            <Input
              aria-labelledby="reference-label-label"
              value={form.label}
              maxLength={80}
              required
              onChange={(e) => set({ label: e.target.value })}
            />
          </Field>
        )}
        {!law && (
          <>
            <Field
              label={<span id="reference-forum-label">Forum</span>}
              optional
              help={
                form.jurisdiction
                  ? 'A court, agency or tribunal in this jurisdiction.'
                  : 'Choose a jurisdiction first.'
              }
            >
              <select
                aria-labelledby="reference-forum-label"
                className={`cl-input ${styles.select}`}
                value={form.forumId}
                disabled={!form.jurisdiction || forums.isFetching}
                onChange={(e) => set({ forumId: e.target.value })}
              >
                <option value="">No forum</option>
                {options.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<span id="reference-docket-label">Docket or case number</span>} optional>
              <Input
                aria-labelledby="reference-docket-label"
                value={form.docketNumber}
                maxLength={100}
                onChange={(e) => set({ docketNumber: e.target.value })}
              />
            </Field>
          </>
        )}
      </fieldset>
      {!law && form.jurisdiction && (
        <div className={styles.actions}>
          {forums.isFetching && <p role="status">Loading forums…</p>}
          {forums.isError && (
            <Banner
              role="alert"
              tone="warning"
              title="Forums could not be loaded"
              actions={<Button onClick={() => void forums.refetch()}>Retry forums</Button>}
            />
          )}
          {cursor && (
            <Button type="button" disabled={!!intent} onClick={() => page(undefined)}>
              First forums
            </Button>
          )}
          {forums.data?.nextCursor && (
            <Button
              type="button"
              disabled={!!intent}
              onClick={() => page(forums.data!.nextCursor!)}
            >
              More forums
            </Button>
          )}
          {forums.data?.canCreate && (
            <Button
              type="button"
              variant="secondary"
              disabled={!!intent}
              onClick={() => setCreating(true)}
            >
              New forum
            </Button>
          )}
        </div>
      )}
      {error && <Banner role="alert" tone="warning" title={error} />}
      <div className={styles.actions}>
        {!terminal && (
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !form.jurisdiction || (!law && forums.isFetching)}
          >
            {busy ? 'Adding reference…' : intent ? 'Check reference request' : 'Add reference'}
          </Button>
        )}
        {terminal && (
          <Button
            type="button"
            onClick={() => {
              reset();
              setError('');
              onAdded();
            }}
          >
            Start over
          </Button>
        )}
      </div>
    </form>
  );
}
