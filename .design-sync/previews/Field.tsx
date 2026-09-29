import { Field, Input, Select, Stepper, Textarea } from '@lawfirm/ui-web';

export const WithHelp = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Client name" help="Conflict check runs as you type.">
      <Input defaultValue="Margaret Bennett" />
    </Field>
  </div>
);

export const Optional = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Responsible attorney" optional help="Defaults to you.">
      <Select value="Dana Okafor" />
    </Field>
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Matter number" error="Already used by Estate of Harold Bennett.">
      <Input defaultValue="2026-0187" />
    </Field>
  </div>
);

export const WrapsAnyControl = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field label="Duration" help="Rounds to 0.1h (6 min)">
      <Stepper value="1:36" />
    </Field>
    <Field label="Stage">
      <Select dot="accent" value="Inventory" />
    </Field>
    <Field label="Narrative" help="Clients see this on the invoice.">
      <Textarea defaultValue="Drafted inventory schedules A and B" />
    </Field>
  </div>
);
