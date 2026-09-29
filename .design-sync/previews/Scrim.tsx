import {
  Button,
  Dialog,
  Field,
  Form,
  FormRow,
  IconButton,
  Input,
  List,
  ListRow,
  Mono,
  Pill,
  RowSep,
  Scrim,
  Select,
  Sheet,
  Text,
} from '@lawfirm/ui-web';

const screen = {
  position: 'relative',
  width: 358,
  height: 520,
  background: 'var(--surface-2)',
  borderRadius: 16,
  overflow: 'hidden',
} as const;

const Behind = () => (
  <div className="cl-stack" style={{ padding: 16 }}>
    <Text variant="title-2" as="h1" style={{ margin: 0 }}>
      Invoices
    </Text>
    <List>
      <ListRow
        title="Margaret Bennett"
        subtitle={
          <>
            <Mono>INV-2026-078</Mono> <RowSep /> Estate of Bennett
          </>
        }
        value="$8,125.00"
        pill={
          <Pill tone="danger" dot>
            Overdue 46d
          </Pill>
        }
      />
      <ListRow
        title="Kessler Holdings LLC"
        subtitle={
          <>
            <Mono>INV-2026-092</Mono> <RowSep /> Series B
          </>
        }
        value="$25,000.00"
        pill={<Pill tone="info">Sent · due Oct 9</Pill>}
      />
      <ListRow
        title="Thanh Nguyen"
        subtitle={
          <>
            <Mono>INV-2026-061</Mono> <RowSep /> Nguyen v. Cascade
          </>
        }
        value="$4,450.00"
        pill={
          <Pill tone="success" dot>
            Paid Jul 18
          </Pill>
        }
      />
    </List>
  </div>
);

export const BottomSheet = () => (
  <div style={screen}>
    <Behind />
    <Scrim>
      <Sheet
        title="Record payment"
        headerRight={<IconButton plain size="sm" icon="x" label="Close" />}
        style={{ width: '100%' }}
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
    </Scrim>
  </div>
);

export const CenteredDialog = () => (
  <div style={screen}>
    <Behind />
    <Scrim center>
      <Dialog
        title="Stop timer at 0:42?"
        text="Rounds to 0.7h. You can adjust before saving."
        actions={
          <>
            <Button variant="ghost">Keep running</Button>
            <Button variant="primary">Stop & log</Button>
          </>
        }
      />
    </Scrim>
  </div>
);
