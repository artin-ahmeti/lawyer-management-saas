import { Field, FormRow, Input, Stepper } from '@lawfirm/ui-web';

export const Duration = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Duration" help="Rounds to 0.1h (6 min)">
      <Stepper value="1:36" />
    </Field>
  </div>
);

export const WithAmount = () => (
  <div style={{ maxWidth: 358 }}>
    <FormRow>
      <Field label="Duration" help="Rounds to 0.1h (6 min)">
        <Stepper value="1:36" />
      </Field>
      <Field label="Amount" help="1.6h × $325.00">
        <Input amount prefix="$" defaultValue="520.00" />
      </Field>
    </FormRow>
  </div>
);

export const WriteDown = () => (
  <div style={{ maxWidth: 358 }}>
    <FormRow>
      <Field
        label="Billed hours"
        help={<span style={{ color: 'var(--warning-ink)' }}>−0.1h from 1:36 recorded</span>}
      >
        <Stepper value="1:30" />
      </Field>
      <Field label="Billed">
        <Input amount prefix="$" defaultValue="487.50" />
      </Field>
    </FormRow>
  </div>
);

export const Installments = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Payment plan" help="4 × $2,031.25 · first due Oct 9">
      <Stepper value="4" />
    </Field>
  </div>
);
