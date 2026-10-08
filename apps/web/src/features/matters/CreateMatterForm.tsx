'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Card, Field, Input } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { createMatterSchema } from '@lawfirm/core';
import {
  prepareMatterCreation,
  submitMatterCreation,
  type MatterCreationIntent,
} from './live-matters';
import styles from './LiveMatters.module.css';

export function CreateMatterForm({
  client,
  firmId,
  onSaved,
  onCancel,
}: {
  client: ReturnType<typeof createApiClient>;
  firmId: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(''),
    [reference, setReference] = useState('');
  const [intent, setIntent] = useState<MatterCreationIntent>(),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [terminal, setTerminal] = useState(false);
  const active = useRef(false),
    running = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    document.getElementById('matter-title')?.focus();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  const submit = async () => {
    if (running.current || terminal) return;
    const parsed = createMatterSchema.safeParse({
      title,
      ...(reference.trim() ? { reference } : {}),
    });
    if (!parsed.success) {
      setError('Enter a matter title of 1–200 characters and a reference of up to 80 characters.');
      return;
    }
    const current = intent ?? prepareMatterCreation(parsed.data);
    setIntent(current);
    running.current = true;
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const result = await submitMatterCreation(client, current, firmId, controller.current.signal);
      if (active.current) onSaved(result.matter.id);
    } catch (e) {
      if (!active.current) return;
      const denied = e instanceof ApiError && [401, 403, 404, 409, 422].includes(e.status);
      setTerminal(denied);
      setError(
        denied
          ? 'The matter request is unavailable. Refresh matters to review current access.'
          : 'The result could not be confirmed. Check the same request to recover it safely.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">New matter</h2>}
      subtitle="Your manager access starts with this matter. You can assign staff access from its details."
    >
      <form
        className="cl-stack cl-stack--md"
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label={<span id="matter-title-label">Matter title</span>}
          help="Use a name that helps your team recognize the engagement."
        >
          <Input
            id="matter-title"
            aria-labelledby="matter-title-label"
            aria-describedby={error ? 'matter-create-error' : undefined}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            disabled={!!intent}
          />
        </Field>
        <Field
          label={<span id="matter-reference-label">Reference</span>}
          optional
          help="Your internal matter or engagement reference."
        >
          <Input
            aria-labelledby="matter-reference-label"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={80}
            disabled={!!intent}
          />
        </Field>
        {error && (
          <div id="matter-create-error">
            <Banner role="alert" tone="warning" title={error} />
          </div>
        )}
        <div className={styles.actions}>
          {!terminal && (
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Saving matter…' : intent ? 'Check matter request' : 'Create matter'}
            </Button>
          )}
          {!intent && (
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          )}
          {terminal && (
            <Button type="button" onClick={onCancel}>
              Refresh matters
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
