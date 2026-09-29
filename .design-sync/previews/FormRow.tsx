import { Field, FormRow, Input, Select, Stepper } from '@lawfirm/ui-web';

export const DurationAndAmount = () => (
  <div style={{ maxWidth: 358 }}>
    <FormRow>
      <Field label="Duration" help="From timer · rounds to 0.7h">
        <Stepper value="0:42" />
      </Field>
      <Field label="Amount" help="0.7h × $325.00">
        <Input amount prefix="$" defaultValue="227.50" />
      </Field>
    </FormRow>
  </div>
);

export const DateAndActivity = () => (
  <div style={{ maxWidth: 358 }}>
    <FormRow>
      <Field label="Date">
        <Input icon="calendar" defaultValue="Today, Sep 29" />
      </Field>
      <Field label="Activity">
        <Select code="L110" value="Fact investigation" />
      </Field>
    </FormRow>
  </div>
);

export const TwoInputs = () => (
  <div style={{ maxWidth: 358 }}>
    <FormRow>
      <Field label="First name">
        <Input defaultValue="Margaret" />
      </Field>
      <Field label="Last name">
        <Input defaultValue="Bennett" />
      </Field>
    </FormRow>
  </div>
);
