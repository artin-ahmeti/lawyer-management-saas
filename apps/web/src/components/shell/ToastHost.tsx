'use client';

import { Toast } from '@lawfirm/ui-web';
import { useOverlays } from '@/stores/ui';

export function ToastHost() {
  const toast = useOverlays((s) => s.toast);
  const dismiss = useOverlays((s) => s.dismissToast);
  const notify = useOverlays((s) => s.notify);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 80,
        width: 'max-content',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <Toast
        key={toast.id}
        className="app-pop"
        message={toast.message}
        action={toast.action}
        onAction={() => {
          try {
            toast.onAction?.();
            dismiss();
          } catch (cause) {
            notify(cause instanceof Error ? cause.message : 'Could not undo this change.');
          }
        }}
      />
    </div>
  );
}
