import {
  AiSuggestion,
  Button,
  ButtonRow,
  Field,
  Form,
  FormRow,
  Input,
  OptionRow,
  Select,
  Stepper,
  Switch,
  Textarea,
} from '@lawfirm/ui-web';

export const LogTime = () => (
  <div style={{ maxWidth: 358 }}>
    <Form>
      <Field label="Matter">
        <Select value="Estate of Harold Bennett" mono="2026-0187" />
      </Field>
      <FormRow>
        <Field label="Duration" help="From timer · rounds to 0.7h">
          <Stepper value="0:42" />
        </Field>
        <Field label="Amount" help="0.7h × $325.00">
          <Input amount prefix="$" defaultValue="227.50" />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Date">
          <Input icon="calendar" defaultValue="Today, Sep 29" />
        </Field>
        <Field label="Activity">
          <Select code="L110" value="Fact investigation" />
        </Field>
      </FormRow>
      <Field label="Narrative">
        <Textarea
          minHeight={76}
          defaultValue="drafted inventory schedules A and B, reconciled w/ appraiser numbers"
        />
        <AiSuggestion
          label="Suggested cleanup · not applied"
          text="Drafted Inventory and Appraisal Schedules A and B; reconciled asset values with appraiser’s report."
          actions={[{ label: 'Use this' }, { label: 'Dismiss', quiet: true }]}
        />
      </Field>
      <OptionRow label="Billable" control={<Switch checked />} style={{ padding: '4px 0' }} />
      <Button variant="primary" size="lg" block>
        Save 0.7h · $227.50
      </Button>
    </Form>
  </div>
);

export const RecordPayment = () => (
  <div style={{ maxWidth: 358 }}>
    <Form>
      <Field label="Invoice">
        <Select value="Margaret Bennett" mono="INV-2026-078" />
      </Field>
      <Field label="Amount" help="Balance due $8,125.00 · 46 days overdue">
        <Input amount prefix="$" defaultValue="8,125.00" />
      </Field>
      <FormRow>
        <Field label="Received">
          <Input icon="calendar" defaultValue="Mon, Sep 29" />
        </Field>
        <Field label="Method">
          <Select value="Check" />
        </Field>
      </FormRow>
      <Field label="Deposit to" help="Earned fees go to operating.">
        <Select icon="building" value="Operating" mono="····0917" />
      </Field>
      <OptionRow
        label="Email receipt to Margaret Bennett"
        control={<Switch checked />}
        style={{ padding: '4px 0' }}
      />
      <ButtonRow>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Record $8,125.00</Button>
      </ButtonRow>
    </Form>
  </div>
);
