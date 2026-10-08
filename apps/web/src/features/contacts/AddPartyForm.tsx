'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import type { ContactRecord, MatterPartyRole } from '@lawfirm/core';
import { Banner, Button, Field, Input } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ContactForm } from './ContactForm';
import {
  loadContactList,
  preparePartyCommand,
  submitPartyCommand,
  type PartyCommand,
} from './live-contacts';
import { liveQuery } from './LiveContactsPage';
import { partyRoles } from './party-labels';
import styles from './LiveContacts.module.css';

/** Link an existing or newly created contact to the matter. One intent survives an uncertain result. */
export function AddPartyForm({
  client,
  context,
  firmId,
  matterId,
  onAdded,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  matterId: string;
  onAdded: () => void;
}) {
  const [draft, setDraft] = useState(''),
    [q, setQ] = useState(''),
    [created, setCreated] = useState<ContactRecord>(),
    [creating, setCreating] = useState(false);
  const [contactId, setContactId] = useState(''),
    [role, setRole] = useState<MatterPartyRole>('client'),
    [label, setLabel] = useState('');
  const [intent, setIntent] = useState<PartyCommand>(),
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
  const results = useQuery({
    ...liveQuery,
    queryKey: ['server-contacts', context, 'party-search', q],
    enabled: !!q,
    queryFn: ({ signal }) => loadContactList(client, firmId, { q }, signal),
  });
  const options = [
    ...(created ? [created] : []),
    ...(results.data?.items ?? []).filter((c) => c.id !== created?.id),
  ];
  const reset = () => {
    setIntent(undefined);
    setTerminal(false);
    setContactId('');
    setLabel('');
    setRole('client');
    setCreated(undefined);
    setDraft('');
    setQ('');
  };
  const submit = async () => {
    if (running.current || terminal) return;
    let current = intent;
    if (!current) {
      try {
        current = preparePartyCommand({
          kind: 'add',
          matterId,
          input: { contactId, role, ...(label.trim() ? { label } : {}) },
        });
      } catch {
        setError(
          'Choose a contact and a role. Describe the role of an other party in up to 80 characters.',
        );
        return;
      }
      setIntent(current);
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await submitPartyCommand(client, current, firmId);
      if (!active.current) return;
      reset();
      onAdded();
    } catch (e) {
      if (!active.current) return;
      const final = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(final);
      setError(
        e instanceof ApiError && e.code === 'PARTY_EXISTS'
          ? 'This contact is already a party to this matter. End that link first to change the role.'
          : final
            ? 'The party could not be added. Refresh the matter to review current access.'
            : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  if (creating)
    return (
      <ContactForm
        client={client}
        firmId={firmId}
        idPrefix="party-contact"
        onCancel={() => setCreating(false)}
        onSaved={(contact) => {
          setCreated(contact);
          setContactId(contact.id);
          setCreating(false);
        }}
      />
    );
  return (
    <div className="cl-stack cl-stack--md">
      <h3 className="cl-t-title-3">Add a party</h3>
      <form
        role="search"
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
        }}
      >
        <Field label={<span id="party-search-label">Find a contact</span>}>
          <Input
            type="search"
            aria-labelledby="party-search-label"
            value={draft}
            maxLength={100}
            disabled={!!intent}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!!intent}>
          Find contacts
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!!intent}
          onClick={() => setCreating(true)}
        >
          New contact
        </Button>
      </form>
      <form
        className="cl-stack cl-stack--md"
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {results.isFetching ? (
          <p role="status">Searching contacts…</p>
        ) : results.isError ? (
          <Banner role="alert" tone="warning" title="Contacts could not be searched" />
        ) : (
          (q || created) && (
            <fieldset className={`cl-stack cl-stack--sm ${styles.choices}`} disabled={!!intent}>
              <legend className="cl-muted">Contact</legend>
              {!options.length && (
                <p role="status">No contacts match “{q}”. Create a new contact instead.</p>
              )}
              {options.map((c) => (
                <label key={c.id} className={styles.choice}>
                  <input
                    type="radio"
                    name="party-contact"
                    value={c.id}
                    checked={contactId === c.id}
                    onChange={() => setContactId(c.id)}
                  />
                  <span>
                    {c.displayName}{' '}
                    <span className="cl-muted">
                      · {c.kind === 'person' ? 'Person' : 'Organization'}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )
        )}
        <Field label={<label htmlFor="party-role">Party role</label>}>
          <select
            id="party-role"
            className={`cl-input ${styles.select}`}
            value={role}
            disabled={!!intent}
            onChange={(e) => setRole(e.target.value as MatterPartyRole)}
          >
            {partyRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={<span id="party-label-label">Role description</span>}
          optional={role !== 'other'}
          help={
            role === 'other'
              ? 'For example lender, guarantor or co-counsel.'
              : 'Shown beside the role.'
          }
        >
          <Input
            aria-labelledby="party-label-label"
            value={label}
            maxLength={80}
            required={role === 'other'}
            disabled={!!intent}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        {error && <Banner role="alert" tone="warning" title={error} />}
        <div className={styles.actions}>
          {!terminal && (
            <Button type="submit" variant="primary" disabled={busy || !contactId}>
              {busy ? 'Adding party…' : intent ? 'Check party request' : 'Add party'}
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
    </div>
  );
}
