import { Field, Select } from '@lawfirm/ui-web';

export const MatterPicker = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Matter">
      <Select value="Estate of Harold Bennett" mono="2026-0187" />
    </Field>
  </div>
);

export const Identifiers = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field
      label="Deposit to"
      help="Retainers must go to trust. Operating is selected automatically for earned fees."
    >
      <Select icon="lock" value="Trust · IOLTA" mono="····4821" />
    </Field>
    <Field label="Activity">
      <Select code="L110" value="Fact investigation" />
    </Field>
    <Field label="Invoice">
      <Select value="Margaret Bennett" mono="INV-2026-078" />
    </Field>
  </div>
);

export const StageDots = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack cl-stack--sm">
    <Select dot="accent" value="Inventory" />
    <Select dot="info" value="Discovery" />
    <Select dot="warning" value="Pre-bill review" />
    <Select dot="success" value="Closed" />
  </div>
);

export const PlaceholderAndPlain = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field label="Client">
      <Select placeholder="Choose a contact" />
    </Field>
    <Field label="Practice area">
      <Select value="Probate" />
    </Field>
    <Field label="Responsible attorney">
      <Select icon="user" value="Dana Okafor" />
    </Field>
  </div>
);
