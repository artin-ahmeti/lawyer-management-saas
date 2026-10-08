'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  createPracticeProfileSchema,
  practiceStarters,
  type PracticeProfileRecord,
  type PracticeStarterKey,
} from '@lawfirm/core';
import { Banner, Button, Card, Field, Input } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { draftFrom, definitionsFrom, type DraftField } from './field-drafts';
import { FieldDefinitionEditor } from './FieldDefinitionEditor';
import {
  prepareProfileCommand,
  profileChanges,
  submitProfileCommand,
  type ProfileCommand,
} from './live-profiles';
import styles from './PracticeProfiles.module.css';

const starterKeys = Object.keys(practiceStarters) as PracticeStarterKey[];
const messages: Record<string, string> = {
  PROFILE_NAME_TAKEN: 'An active profile already uses this name. Choose another name.',
  PROFILE_CHANGED:
    'This profile changed after you opened it. Close it and review the current version.',
  PROFILE_UNCHANGED: 'This profile already has these details.',
  STARTER_UNAVAILABLE: 'This starter is no longer available. Start from a blank profile.',
};

/** Create a profile (blank or from a starter) or publish a revision of one. */
export function ProfileEditor({
  client,
  firmId,
  profile,
  onSaved,
  onCancel,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  profile?: PracticeProfileRecord;
  onSaved: (profile: PracticeProfileRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? ''),
    [description, setDescription] = useState(profile?.description ?? ''),
    [starter, setStarter] = useState<PracticeStarterKey | ''>(''),
    [archived, setArchived] = useState(profile?.archived ?? false),
    [drafts, setDrafts] = useState<DraftField[]>(
      () => profile?.currentVersion.fields.map((f) => draftFrom(f, true)) ?? [],
    );
  const [intent, setIntent] = useState<ProfileCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    document.getElementById('profile-name')?.focus();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  const chooseStarter = (key: PracticeStarterKey | '') => {
    setStarter(key);
    const chosen = key ? practiceStarters[key] : undefined;
    setDrafts(chosen ? chosen.fields.map((f) => draftFrom(f, true)) : []);
    if (chosen) {
      setName(chosen.name);
      setDescription(chosen.description);
    }
  };
  const prepare = (): ProfileCommand | string => {
    const fields = definitionsFrom(drafts);
    if (profile) {
      const changes = profileChanges(profile, { name, description, fields, archived });
      return changes
        ? prepareProfileCommand({ kind: 'revise', profileId: profile.id, input: changes })
        : 'Change at least one detail before saving.';
    }
    const parsed = createPracticeProfileSchema.safeParse({
      name,
      ...(description.trim() ? { description } : {}),
      ...(starter ? { basedOn: { key: starter, version: practiceStarters[starter].version } } : {}),
      fields,
    });
    return parsed.success
      ? prepareProfileCommand({ kind: 'create', input: parsed.data })
      : 'Check the name (up to 80 characters), each field label (up to 80) and that choice fields list distinct options.';
  };
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      let prepared: ProfileCommand | string;
      try {
        prepared = prepare();
      } catch {
        prepared =
          'Check the name (up to 80 characters), each field label (up to 80) and that choice fields list distinct options.';
      }
      if (typeof prepared === 'string') return setError(prepared);
      current = prepared;
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const result = await submitProfileCommand(client, current, firmId, controller.current.signal);
      if (active.current) onSaved(result.profile);
    } catch (e) {
      if (!active.current) return;
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        e instanceof ApiError && messages[e.code]
          ? messages[e.code]!
          : final
            ? 'This change is unavailable. Close it and review your current access.'
            : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  const locked = !!intent;
  return (
    <Card
      className={styles.card}
      title={
        <h2 className="cl-t-title-2">
          {profile ? `Edit ${profile.name}` : 'New practice profile'}
        </h2>
      }
      subtitle={
        profile
          ? `Changing fields publishes version ${profile.currentVersion.version + 1}. Matters keep the version they started with.`
          : 'Add a practice area and its fields without a code change. Starters are generic and not reviewed for any jurisdiction.'
      }
    >
      <form
        className="cl-stack cl-stack--md"
        // The shared field rules report problems beside each field instead of native bubbles.
        noValidate
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!profile && (
          <Field label={<span id="profile-starter-label">Start from</span>}>
            <select
              aria-labelledby="profile-starter-label"
              className={`cl-input ${styles.select}`}
              value={starter}
              disabled={locked}
              onChange={(e) => chooseStarter(e.target.value as PracticeStarterKey | '')}
            >
              <option value="">Blank profile</option>
              {starterKeys.map((key) => (
                <option key={key} value={key}>
                  Starter: {practiceStarters[key].name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={<span id="profile-name-label">Profile name</span>}>
          <Input
            id="profile-name"
            aria-labelledby="profile-name-label"
            value={name}
            maxLength={80}
            required
            disabled={locked}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={<span id="profile-description-label">Description</span>} optional>
          <Input
            aria-labelledby="profile-description-label"
            value={description}
            maxLength={300}
            disabled={locked}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <h3 className="cl-t-body-strong">Fields</h3>
        <FieldDefinitionEditor drafts={drafts} onChange={setDrafts} disabled={locked} />
        {profile && (
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={archived}
              disabled={locked}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Archived: hidden from new matters; existing matters keep it
          </label>
        )}
        {error && <Banner role="alert" tone="warning" title={error} />}
        <div className={styles.actions}>
          {!terminal && (
            <Button type="submit" variant="primary" disabled={busy}>
              {busy
                ? 'Saving profile…'
                : intent
                  ? 'Check profile request'
                  : profile
                    ? 'Save profile'
                    : 'Create profile'}
            </Button>
          )}
          {(!intent || terminal) && (
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
              {terminal ? 'Close and refresh' : 'Cancel'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
