'use client';

import { Button, Icon } from '@lawfirm/ui-web';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native modal provides focus containment, Escape, an inert background and focus restoration. */
export function Modal({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`app-modal ${drawer ? 'app-modal--drawer' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
          onClose();
      }}
    >
      <div className="cl-spread app-modal__head">
        <h2 id={titleId} className="cl-t-title-3">
          {title}
        </h2>
        <Button variant="ghost" iconOnly aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
