import { Button, EmptyState } from '@lawfirm/ui-web';

export const NothingToReview = () => (
  <div style={{ maxWidth: 358 }}>
    <EmptyState
      icon="clock"
      title="Nothing to review"
      text="Calls, meetings and voice memos you haven’t billed will show up here."
    />
  </div>
);

export const FirstRun = () => (
  <div style={{ maxWidth: 358 }}>
    <EmptyState
      large
      title="Your first matter."
      text="Start from a playbook and the stages, tasks and billing model come with it."
      action={<Button variant="primary">Open a matter</Button>}
    />
  </div>
);

export const NoResults = () => (
  <div style={{ maxWidth: 358 }}>
    <EmptyState
      icon="search"
      title="No matches for “Bennet”"
      text="Try the matter number, the client’s last name or an invoice number."
      action={
        <Button variant="secondary" size="sm">
          Clear search
        </Button>
      }
    />
  </div>
);
