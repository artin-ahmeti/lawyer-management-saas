'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { createContactSchema, type ContactKind, type ContactRecord } from '@lawfirm/core';
import { Banner, Button, Card, Field, Input } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import {
  contactChanges,
  prepareContactCommand,
  submitContactCommand,
  type ContactCommand,
} from './live-contacts';
import styles from './LiveContacts.module.css';

const kinds = [
  { value: 'person', label: 'Person' },
  { value: 'organization', label: 'Organization' },
];

/** Create a contact, or edit one against its loaded revision. One intent survives an uncertain result. */
export function ContactForm({
  client,
  firmId,
  contact,
  idPrefix = 'contact',
  onSaved,
  onCancel,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  contact?: ContactRecord;
  idPrefix?: string;
  onSaved: (contact: ContactRecord) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<ContactKind>(contact?.kind ?? 'person');
  const [form, setForm] = useState({
    displayName: contact?.displayName ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  });
  const [intent, setIntent] = useState<ContactCommand>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    document.getElementById(`${idPrefix}-name`)?.focus();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [idPrefix]);
  const prepare = () => {
    if (contact) {
      const changes = contactChanges(contact, form);
      return (
        changes && prepareContactCommand({ kind: 'update', contactId: contact.id, input: changes })
      );
    }
    const parsed = createContactSchema.safeParse({
      kind,
      displayName: form.displayName,
      ...(form.email.trim() ? { email: form.email } : {}),
      ...(form.phone.trim() ? { phone: form.phone } : {}),
    });
    return parsed.success ? prepareContactCommand({ kind: 'create', input: parsed.data }) : null;
  };
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      try {
        current = prepare() ?? undefined;
      } catch {
        current = undefined;
      }
      if (!current) {
        setError(
          contact
            ? 'Change at least one detail. Use a valid email and a phone number of digits and punctuation.'
            : 'Enter a name of 1–200 characters, a valid email and a phone number of digits and punctuation.',
        );
        return;
      }
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const result = await submitContactCommand(client, current, firmId, controller.current.signal);
      if (active.current) onSaved(result.contact);
    } catch (e) {
      if (!active.current) return;
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        e instanceof ApiError && e.code === 'CONTACT_CHANGED'
          ? 'This contact changed after you opened it. Reload it to review the current details.'
          : final
            ? 'The contact request is unavailable. Reload contacts to review your current access.'
            : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  const field = (key: keyof typeof form, label: string, help: string, type = 'text') => (
    <Field
      label={<span id={`${idPrefix}-${key}-label`}>{label}</span>}
      optional={key !== 'displayName'}
      help={help}
    >
      <Input
        id={`${idPrefix}-${key === 'displayName' ? 'name' : key}`}
        aria-labelledby={`${idPrefix}-${key}-label`}
        aria-describedby={error ? `${idPrefix}-error` : undefined}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={key === 'displayName'}
        maxLength={key === 'displayName' ? 200 : key === 'email' ? 320 : 40}
        disabled={!!intent}
      />
    </Field>
  );
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">{contact ? 'Edit contact' : 'New contact'}</h2>}
      subtitle={
        contact
          ? `Changes apply to revision ${contact.revision}. Everyone in your firm sees the directory.`
          : 'Contacts are shared with your firm. Matter links stay limited to people with matter access.'
      }
    >
      <form
        className="cl-stack cl-stack--md"
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!contact && (
          <Field label={<label htmlFor={`${idPrefix}-kind`}>Contact type</label>}>
            <select
              id={`${idPrefix}-kind`}
              className={`cl-input ${styles.select}`}
              value={kind}
              disabled={!!intent}
              onChange={(e) => setKind(e.target.value as ContactKind)}
            >
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {field(
          'displayName',
          kind === 'person' ? 'Full name' : 'Organization name',
          'As it should appear across matters.',
        )}
        {field(
          'email',
          'Email',
          'Stored on the contact only; history records that it changed.',
          'email',
        )}
        {field(
          'phone',
          'Phone',
          'Digits, spaces, parentheses or dashes; an extension is optional.',
          'tel',
        )}
        {error && (
          <div id={`${idPrefix}-error`}>
            <Banner role="alert" tone="warning" title={error} />
          </div>
        )}
        <div className={styles.actions}>
          {!terminal && (
            <Button type="submit" variant="primary" disabled={busy}>
              {busy
                ? 'Saving contact…'
                : intent
                  ? 'Check contact request'
                  : contact
                    ? 'Save contact'
                    : 'Create contact'}
            </Button>
          )}
          {(!intent || terminal) && (
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
              {terminal ? 'Close and reload' : 'Cancel'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
