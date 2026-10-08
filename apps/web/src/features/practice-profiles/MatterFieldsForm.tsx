'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { applyFieldValues, type MatterFields, type PracticeProfileRecord } from '@lawfirm/core';
import { Banner, Button } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { FieldValueInputs } from './FieldValueInputs';
import {
  fieldForm,
  fieldPatch,
  prepareMatterFieldsCommand,
  submitMatterFieldsCommand,
  type MatterFieldsCommand,
} from './live-profiles';
import { ProfilePicker } from './ProfilePicker';
import styles from './PracticeProfiles.module.css';

const messages: Record<string, string> = {
  MATTER_CHANGED: 'This matter changed after you opened it. Refresh to review the current values.',
  MATTER_FIELDS_UNCHANGED: 'These values are already saved.',
  PROFILE_CHANGED: 'This practice profile changed. Choose it again to use its current fields.',
  PROFILE_ARCHIVED: 'This practice profile was archived. Choose an active profile.',
  PROFILE_PINNED: 'This matter already uses a practice profile. Refresh to review it.',
};

/**
 * Edit values against the loaded matter revision, or assign a profile to a matter without
 * one. One intent survives an uncertain result; a refused change asks for a refresh.
 */
export function MatterFieldsForm({
  client,
  context,
  firmId,
  fields: loaded,
  onSaved,
  onCancel,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  fields: MatterFields;
  onSaved: (fields: MatterFields) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<PracticeProfileRecord>();
  const definitions = loaded.profile?.version.fields ?? picked?.currentVersion.fields ?? [];
  const [form, setForm] = useState(() => fieldForm(definitions, loaded.values));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<MatterFieldsCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  const assigning = !loaded.profile;
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      if (assigning && !picked) return setError('Choose a practice profile first.');
      const patch = fieldPatch(definitions, loaded.values, form);
      const checked = applyFieldValues(definitions, loaded.values, patch);
      if (!checked.ok) {
        setIssues(Object.fromEntries(checked.issues.map((i) => [i.key, i.message])));
        return setError(checked.issues[0]!.message);
      }
      if (!assigning && !checked.changed.length) return setError('Change at least one value.');
      setIssues({});
      current = prepareMatterFieldsCommand(loaded.matterId, {
        expectedRevision: loaded.revision,
        ...(assigning ? { profileVersionId: picked!.currentVersion.id } : {}),
        values: patch,
      });
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const result = await submitMatterFieldsCommand(client, current, controller.current.signal);
      if (active.current) onSaved(result.fields);
    } catch (e) {
      if (!active.current) return;
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        e instanceof ApiError && e.code === 'FIELD_VALUES_INVALID'
          ? e.message
          : e instanceof ApiError && messages[e.code]
            ? messages[e.code]!
            : final
              ? 'This change is unavailable. Refresh the matter to review your current access.'
              : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <form
      className="cl-stack cl-stack--md"
      // The shared field rules report problems beside each field instead of native bubbles.
      noValidate
      aria-busy={busy}
      aria-label={assigning ? 'Add a practice profile' : 'Edit matter fields'}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {assigning && (
        <ProfilePicker
          client={client}
          context={context}
          firmId={firmId}
          idPrefix="matter-assign"
          disabled={!!intent}
          onProfile={(next) => {
            setPicked(next);
            setForm(fieldForm(next?.currentVersion.fields ?? [], {}));
            setIssues({});
          }}
        />
      )}
      {definitions.length > 0 && (
        <FieldValueInputs
          fields={definitions}
          form={form}
          onChange={setForm}
          idPrefix="matter-field"
          disabled={!!intent}
          issues={issues}
        />
      )}
      {error && <Banner role="alert" tone="warning" title={error} />}
      <div className={styles.actions}>
        {!terminal && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy
              ? 'Saving fields…'
              : intent
                ? 'Check field request'
                : assigning
                  ? 'Add profile'
                  : 'Save fields'}
          </Button>
        )}
        {(!intent || terminal) && (
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            {terminal ? 'Close and refresh' : 'Cancel'}
          </Button>
        )}
      </div>
    </form>
  );
}
