'use client';

import {
  Banner,
  Button,
  Field,
  FormRow,
  Input,
  SegmentedControl,
  Switch,
  Textarea,
} from '@lawfirm/ui-web';
import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import { NativeSelect } from '@/components/NativeSelect';
import {
  useContacts,
  useInvoices,
  useMatters,
  useSettings,
  useTimekeepers,
  useWrites,
  paymentInstallments,
  type PracticeArea,
  type ContactRole,
  type PaymentInput,
} from '@/lib/data';
import { todayIso } from '@/lib/clock';
import { money } from '@/lib/format';
import { useOverlays, type FormOverlay } from '@/stores/ui';

const TITLES = {
  matter: 'New matter',
  contact: 'New contact',
  event: 'New event',
  payment: 'Record payment',
  paymentPlan: 'Offer a payment plan',
  deposit: 'Record trust deposit',
  disbursement: 'Record disbursement',
  invite: 'Invite a user',
};

export function DomainForms() {
  const form = useOverlays((s) => s.form);
  return form ? (
    <DomainForm key={`${form.kind}-${form.invoiceId ?? form.matterId ?? ''}`} form={form} />
  ) : null;
}

function DomainForm({ form }: { form: FormOverlay }) {
  const close = useOverlays((s) => s.closeForm);
  const notify = useOverlays((s) => s.notify);
  const matters = useMatters();
  const contacts = useContacts();
  const invoices = useInvoices();
  const people = useTimekeepers();
  const settings = useSettings();
  const writes = useWrites();
  const [error, setError] = useState('');
  const [matterId, setMatterId] = useState(form.matterId ?? 'm2');
  const [invoiceId, setInvoiceId] = useState(form.invoiceId ?? 'i1');
  const [area, setArea] = useState('Probate');
  const [clientId, setClientId] = useState('c2');
  const [assignee, setAssignee] = useState('do');
  const [role, setRole] = useState('Client');
  const [method, setMethod] = useState('ACH');
  const [count, setCount] = useState('4');
  const [autoCharge, setAutoCharge] = useState(true);
  const invoice = invoices.data?.find((i) => i.id === invoiceId);
  const installments =
    invoice && invoice.balanceCents > 0
      ? paymentInstallments(invoice.balanceCents, Number(count))
      : [];
  const matterField = (
    <Field label="Matter">
      <NativeSelect
        label="Matter"
        value={matterId}
        onChange={setMatterId}
        options={(matters.data ?? []).map((m) => ({ value: m.id, label: m.title }))}
      />
    </Field>
  );
  const invoiceField = (
    <Field label="Invoice">
      <NativeSelect
        label="Invoice"
        value={invoiceId}
        onChange={setInvoiceId}
        options={(invoices.data ?? [])
          .filter((i) => i.balanceCents > 0 && i.status !== 'draft')
          .map((i) => ({ value: i.id, label: `${i.number} · ${i.clientName}` }))}
      />
    </Field>
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const cents = (name: string) => Math.round(Number(text(name)) * 100);
    try {
      let undo: (() => void) | undefined;
      if (form.kind === 'matter')
        undo = writes.createMatter({
          title: text('title'),
          clientId,
          area: area as PracticeArea,
          responsibleId: assignee,
          rateCents: cents('rate'),
        });
      if (form.kind === 'contact')
        undo = writes.createContact({
          name: text('name'),
          email: text('email'),
          phone: text('phone'),
          kind: data.get('company') ? 'org' : 'person',
          role: role as ContactRole,
        });
      if (form.kind === 'event')
        undo = writes.createEvent({
          title: text('title'),
          matterId,
          startsAt: `${text('date')}T${text('time')}:00-07:00`,
          durationMin: Number(text('duration')),
          sub: text('location'),
          kind: 'Meeting',
          tone: 'neutral',
          dot: false,
        });
      if (form.kind === 'payment')
        undo = writes.recordPayment({
          invoiceId,
          amountCents: cents('amount'),
          method: method as PaymentInput['method'],
          date: text('date'),
          reference: text('reference'),
        });
      if (form.kind === 'paymentPlan')
        undo = writes.setPaymentPlan(invoiceId, Number(count), autoCharge);
      if (form.kind === 'deposit' || form.kind === 'disbursement')
        undo = writes.trustTransaction({
          matterId,
          amountCents: cents('amount'),
          description: text('description'),
          kind: form.kind === 'deposit' ? 'deposit' : 'disbursement',
        });
      if (form.kind === 'invite') undo = writes.inviteUser(text('name'), text('email'));
      close();
      const client = invoice?.clientName ?? 'client';
      notify(
        form.kind === 'invite'
          ? 'Invite sent · they get the mobile app on day one'
          : form.kind === 'payment'
            ? `Payment received · ${money(cents('amount'))} from ${client}`
            : form.kind === 'paymentPlan'
              ? `Payment plan offered to ${client}`
              : `${TITLES[form.kind]} saved`,
        'Undo',
        undo,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    }
  };
  return (
    <Modal title={TITLES[form.kind]} onClose={close}>
      <form onSubmit={submit} className="cl-form app-modal__body">
        {error ? <Banner tone="danger" title={error} role="alert" /> : null}
        {form.kind === 'matter' ? (
          <>
            <Field label="Matter name">
              <Input name="title" aria-label="Matter name" autoFocus required />
            </Field>
            <Field label="Client">
              <NativeSelect
                label="Client"
                value={clientId}
                onChange={setClientId}
                options={(contacts.data ?? [])
                  .filter((c) => c.role === 'Client')
                  .map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Playbook">
              <NativeSelect
                label="Playbook"
                value={area}
                onChange={setArea}
                options={[
                  'Probate',
                  'Personal injury',
                  'Corporate',
                  'Criminal defense',
                  'Family',
                  'Immigration',
                ].map((a) => ({ value: a, label: a }))}
              />
            </Field>
            <FormRow>
              <Field label="Responsible">
                <NativeSelect
                  label="Responsible"
                  value={assignee}
                  onChange={setAssignee}
                  options={(people.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
                />
              </Field>
              <Field label="Hourly rate">
                <Input
                  name="rate"
                  aria-label="Hourly rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="425"
                  prefix="$"
                  required
                />
              </Field>
            </FormRow>
          </>
        ) : null}
        {form.kind === 'contact' || form.kind === 'invite' ? (
          <>
            <Field label="Name">
              <Input name="name" aria-label="Name" required autoFocus />
            </Field>
            <Field label="Email">
              <Input
                name="email"
                aria-label="Email"
                type="email"
                required={form.kind === 'invite'}
              />
            </Field>
            {form.kind === 'contact' ? (
              <>
                <Field label="Phone">
                  <Input name="phone" aria-label="Phone" type="tel" />
                </Field>
                <Field label="Role">
                  <NativeSelect
                    label="Role"
                    value={role}
                    onChange={setRole}
                    options={['Client', 'Opposing party', 'Expert witness'].map((r) => ({
                      value: r,
                      label: r,
                    }))}
                  />
                </Field>
                <label className="cl-option">
                  <span>Company</span>
                  <input type="checkbox" name="company" />
                </label>
              </>
            ) : (
              <Banner
                tone="outline"
                icon="users"
                title="One more seat"
                text={`Adds one internal user at ${money(settings.data?.firm.plan.perSeatCents ?? 0).replace('.00', '')}/month, prorated to ${settings.data?.firm.plan.renewsOn ?? 'the renewal date'}. They get the mobile app and biometric sign-in on day one.`}
              />
            )}
          </>
        ) : null}
        {form.kind === 'event' ? (
          <>
            <Field label="Event title">
              <Input name="title" aria-label="Event title" required autoFocus />
            </Field>
            {matterField}
            <FormRow>
              <Field label="Date">
                <Input
                  name="date"
                  aria-label="Date"
                  type="date"
                  defaultValue={todayIso()}
                  required
                />
              </Field>
              <Field label="Time">
                <Input name="time" aria-label="Time" type="time" defaultValue="09:00" required />
              </Field>
            </FormRow>
            <Field label="Duration in minutes">
              <Input
                name="duration"
                aria-label="Duration in minutes"
                type="number"
                min="5"
                max="1440"
                defaultValue="60"
                required
              />
            </Field>
            <Field label="Location">
              <Input name="location" aria-label="Location" />
            </Field>
          </>
        ) : null}
        {form.kind === 'payment' ? (
          <>
            {invoiceField}
            <Field label="Amount">
              <Input
                key={`${invoiceId}-${invoice?.balanceCents}`}
                name="amount"
                aria-label="Amount"
                type="number"
                min="0.01"
                max={(invoice?.balanceCents ?? 0) / 100}
                step="0.01"
                defaultValue={((invoice?.balanceCents ?? 0) / 100).toFixed(2)}
                prefix="$"
                required
              />
            </Field>
            <Field label="Method">
              <SegmentedControl
                value={method}
                onChange={setMethod}
                items={['ACH', 'Card', 'Check', 'Trust'].map((m) => ({ value: m, label: m }))}
              />
            </Field>
            {method === 'Trust' ? (
              <Banner
                tone="outline"
                icon="lock"
                title={`Available for this client: ${money(matters.data?.find((m) => m.id === invoice?.matterId)?.trustCents ?? 0)}`}
              />
            ) : null}
            <FormRow>
              <Field label="Received">
                <Input
                  name="date"
                  aria-label="Received"
                  type="date"
                  defaultValue={todayIso()}
                  required
                />
              </Field>
              <Field label="Reference">
                <Input name="reference" aria-label="Reference" />
              </Field>
            </FormRow>
          </>
        ) : null}
        {form.kind === 'paymentPlan' ? (
          <>
            {invoiceField}
            <Field label="Installments">
              <SegmentedControl
                value={count}
                onChange={setCount}
                items={['2', '3', '4', '6'].map((n) => ({ value: n, label: n }))}
              />
            </Field>
            <div className="cl-list">
              {installments.map((amount, i) => (
                <div key={i} className="cl-row">
                  <div className="cl-row__body">
                    <div className="cl-row__title">Payment {i + 1}</div>
                    <div className="cl-row__sub">
                      {i === 0 ? 'On acceptance' : `${i} month${i > 1 ? 's' : ''} after acceptance`}
                    </div>
                  </div>
                  <span className="cl-row__value">{money(amount)}</span>
                </div>
              ))}
            </div>
            <div className="cl-option">
              <span>Auto-charge</span>
              <Switch checked={autoCharge} onChange={setAutoCharge} label="Auto-charge" />
            </div>
          </>
        ) : null}
        {form.kind === 'deposit' || form.kind === 'disbursement' ? (
          <>
            {matterField}
            <Field label="Amount">
              <Input
                name="amount"
                aria-label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                prefix="$"
                required
              />
            </Field>
            <Field label="Description">
              <Textarea name="description" aria-label="Description" required />
            </Field>
          </>
        ) : null}
        <div className="cl-btn-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {form.kind === 'paymentPlan'
              ? 'Text plan offer'
              : form.kind === 'payment'
                ? 'Record payment'
                : form.kind === 'invite'
                  ? 'Send invite'
                  : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
