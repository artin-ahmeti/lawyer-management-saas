'use client';

import { Button } from '@lawfirm/ui-web';
import { useId } from 'react';
import { useOverlays } from '@/stores/ui';
import { Overlay } from './Overlay';

/** The one confirm dialog: the question in the title, the consequence in the body, the verb on the button. */
export function DialogHost() {
  const dialog = useOverlays((s) => s.dialog);
  const close = useOverlays((s) => s.closeDialog);
  const titleId = useId();
  if (!dialog) return null;
  return (
    <Overlay
      onClose={close}
      labelledBy={titleId}
      style={{ width: 'min(360px, calc(100vw - 32px))', padding: 0 }}
    >
      <div className="cl-dialog app-pop" style={{ color: 'var(--ink)', maxWidth: 'none' }}>
        <div id={titleId} className="cl-dialog__title">
          {dialog.title}
        </div>
        <div className="cl-dialog__text">{dialog.text}</div>
        <div className="cl-dialog__actions">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={dialog.tone ?? 'primary'}
            autoFocus
            onClick={() => {
              close();
              dialog.onConfirm();
            }}
          >
            {dialog.cta}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
