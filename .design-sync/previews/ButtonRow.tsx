import { Button, ButtonRow } from '@lawfirm/ui-web';

export const PayLink = () => (
  <div style={{ maxWidth: 358 }}>
    <ButtonRow>
      <Button variant="secondary">Record payment</Button>
      <Button variant="primary">Text pay link</Button>
    </ButtonRow>
  </div>
);

export const SaveTime = () => (
  <div style={{ maxWidth: 358 }}>
    <ButtonRow>
      <Button variant="secondary" size="lg">
        Save draft
      </Button>
      <Button variant="primary" size="lg">
        Save 0.7h · $227.50
      </Button>
    </ButtonRow>
  </div>
);

export const ConfirmVoid = () => (
  <div style={{ maxWidth: 358 }}>
    <ButtonRow>
      <Button variant="ghost">Keep invoice</Button>
      <Button variant="destructive-solid">Void INV-2026-078</Button>
    </ButtonRow>
  </div>
);
