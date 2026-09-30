'use client';

import { Button, Card, Field, FormRow, Input, Mono } from '@lawfirm/ui-web';
import { useId, useState, type FormEvent } from 'react';
import { NativeSelect } from '@/components/NativeSelect';
import { useWrites, type WorkspaceSettings } from '@/lib/data';
import { useOverlays } from '@/stores/ui';

const STATES =
  'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split(
    '|',
  );

export function FirmProfileForm({ settings }: { settings: WorkspaceSettings }) {
  const writes = useWrites();
  const notify = useOverlays((s) => s.notify);
  const [stateBar, setStateBar] = useState(settings.firm.stateBar);
  const formId = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const address = String(data.get('address') ?? '').trim();
    if (!name || !address) {
      notify('Enter a firm name and address.');
      return;
    }
    const undo = writes.patchSettings({ firm: { ...settings.firm, name, address, stateBar } });
    notify('Firm profile saved', 'Undo', undo);
  };
  return (
    <Card>
      <h2 className="cl-t-title-3" style={{ marginBottom: 14 }}>
        Firm profile
      </h2>
      <form id={formId} className="cl-form" onSubmit={submit}>
        <FormRow>
          <Field label="Firm name">
            <Input name="name" aria-label="Firm name" defaultValue={settings.firm.name} required />
          </Field>
          <Field label="State bar">
            <NativeSelect
              label="State bar"
              value={stateBar}
              onChange={setStateBar}
              options={STATES.map((state) => ({ value: state, label: state }))}
            />
          </Field>
        </FormRow>
        <Field label="Address">
          <Input
            name="address"
            aria-label="Address"
            defaultValue={settings.firm.address}
            required
          />
        </Field>
        <FormRow>
          <Field label="Matter numbering">
            <div className="cl-input" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Mono ink>{settings.firm.matterNumbering}</Mono>
              <span className="cl-muted cl-truncate">· next {settings.firm.nextMatterNumber}</span>
            </div>
          </Field>
          <Field label="Invoice prefix">
            <div className="cl-input">
              <Mono ink>{settings.firm.invoicePrefix}</Mono>
            </div>
          </Field>
        </FormRow>
      </form>
      <div className="cl-inline" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <Button variant="primary" type="submit" form={formId}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}
