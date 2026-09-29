import { Button, Dialog } from '@lawfirm/ui-web';

const pane = {
  background: 'var(--surface-2)',
  padding: 28,
  display: 'flex',
  justifyContent: 'center',
} as const;

export const SendInvoice = () => (
  <div style={pane}>
    <Dialog
      title="Send invoice for $8,125.00?"
      text="Margaret Bennett gets a text and email with a pay link. ACH is offered first; card adds 2.9%."
      actions={
        <>
          <Button variant="ghost">Not yet</Button>
          <Button variant="primary">Send invoice</Button>
        </>
      }
    />
  </div>
);

export const DeleteEntry = () => (
  <div style={pane}>
    <Dialog
      title="Delete this time entry?"
      text="1.6h on Estate of Bennett, not yet invoiced. This can’t be undone and is recorded in the audit log."
      actions={
        <>
          <Button variant="ghost">Keep</Button>
          <Button variant="destructive-solid">Delete entry</Button>
        </>
      }
    />
  </div>
);

export const StopTimer = () => (
  <div style={pane}>
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
  </div>
);
