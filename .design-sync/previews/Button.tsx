import { Button, ButtonRow } from '@lawfirm/ui-web';

export const Variants = () => (
  <div className="cl-inline">
    <Button variant="primary">Send invoice</Button>
    <Button variant="secondary">Record payment</Button>
    <Button variant="outline">Log time</Button>
    <Button variant="tertiary">Payment plan</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Void invoice</Button>
    <Button variant="destructive-solid">Delete</Button>
  </div>
);

export const WithIcons = () => (
  <div className="cl-inline">
    <Button variant="primary" icon="send">
      Text pay link
    </Button>
    <Button variant="secondary" icon="play">
      Start timer
    </Button>
    <Button variant="primary" loading>
      Saving
    </Button>
    <Button variant="primary" disabled>
      Approve
    </Button>
    <Button variant="secondary" iconOnly icon="more" aria-label="More" />
  </div>
);

export const Sizes = () => (
  <div className="cl-inline">
    <Button variant="primary" size="sm">
      Bill 0.2h
    </Button>
    <Button variant="secondary" size="sm">
      Skip
    </Button>
    <Button variant="primary">Continue</Button>
    <Button variant="primary" size="lg">
      Sign in
    </Button>
  </div>
);

export const SheetFooter = () => (
  <div style={{ maxWidth: 358 }}>
    <ButtonRow>
      <Button variant="secondary">Save draft</Button>
      <Button variant="primary">Send for $8,125.00</Button>
    </ButtonRow>
  </div>
);
