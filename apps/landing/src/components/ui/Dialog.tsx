'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/**
 * Modal dialog on the native <dialog> element: focus is trapped by the browser,
 * Escape closes it, and focus returns to the control that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        onClose();
        if (opener.current instanceof HTMLElement) opener.current.focus();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto rounded-xl border border-hairline bg-raised p-0 text-ink shadow-lg',
        'backdrop:bg-[rgb(8_10_14/0.72)] backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
            <h2 id={titleId} className="text-h3 text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 grid size-11 place-items-center rounded-md text-ink-2 hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
