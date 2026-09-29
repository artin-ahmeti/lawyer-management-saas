import {
  Button,
  Field,
  Form,
  FormRow,
  IconButton,
  Input,
  Pill,
  Select,
  Sheet,
  Stepper,
  Textarea,
} from '@lawfirm/ui-web';

const pane = {
  maxWidth: 358,
  background: 'var(--surface-2)',
  paddingTop: 40,
  borderRadius: 16,
  overflow: 'hidden',
} as const;

export const RecordPayment = () => (
  <div style={pane}>
    <Sheet
      title="Record payment"
      headerRight={<IconButton plain size="sm" icon="x" label="Close" />}
    >
      <Form>
        <Field label="Amount" help="Balance on INV-2026-078">
          <Input amount prefix="$" defaultValue="8,125.00" />
        </Field>
        <FormRow>
          <Field label="Method">
            <Select value="Check" />
          </Field>
          <Field label="Deposit to">
            <Select value="Operating" />
          </Field>
        </FormRow>
      </Form>
      <Button variant="primary" size="lg" block>
        Record $8,125.00
      </Button>
    </Sheet>
  </div>
);

export const QuickNote = () => (
  <div style={pane}>
    <Sheet title="Quick note" headerRight={<Pill tone="accent">People v. Webb</Pill>}>
      <Textarea
        placeholder="Judge continued to Oct 14. Prosecution to produce bodycam by…"
        minHeight={96}
      />
      <div className="cl-inline">
        <Button variant="secondary" icon="mic">
          Dictate
        </Button>
        <Button variant="secondary" icon="camera">
          Photo
        </Button>
        <span className="cl-grow" />
        <Button variant="primary">Save</Button>
      </div>
    </Sheet>
  </div>
);

export const LogTime = () => (
  <div style={pane}>
    <Sheet
      title="Log time"
      headerRight={<IconButton plain size="sm" icon="x" label="Close" />}
    >
      <Form>
        <Field label="Matter">
          <Select value="Estate of Harold Bennett" mono="2026-0187" />
        </Field>
        <FormRow>
          <Field label="Duration">
            <Stepper value="1:36" />
          </Field>
          <Field label="Date">
            <Select value="Mon, Sep 29" />
          </Field>
        </FormRow>
        <Field label="Activity">
          <Select code="L110" value="Fact investigation" />
        </Field>
        <Field label="Narrative" help="Billed at $325.00/hr · $520.00">
          <Textarea defaultValue="Draft inventory schedules for probate filing." minHeight={72} />
        </Field>
      </Form>
      <Button variant="primary" size="lg" block>
        Save 1.6h · $520.00
      </Button>
    </Sheet>
  </div>
);
