'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Headless modal: a native <dialog> (focus containment, Escape, inert
 * background, focus restoration) with no chrome, for the confirm dialog and
 * the ⌘K palette whose surfaces come from the design system.
 */
export function Overlay({
  children,
  onClose,
  label,
  labelledBy,
  style,
}: {
  children: ReactNode;
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-labelledby={labelledBy}
      className="app-modal"
      style={{
        background: 'transparent',
        border: 0,
        boxShadow: 'none',
        overflow: 'visible',
        ...style,
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
