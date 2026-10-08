'use client';

import type { ReactNode } from 'react';
import { create } from 'zustand';

export type CaptureKind = 'Start timer' | 'Voice memo' | 'Log time' | 'Expense' | 'Task' | 'Note';

export interface CapturePrefill {
  matterId?: string;
  minutes?: number;
  narrative?: string;
  /** Set when the drawer opens from a stopped timer. */
  fromTimer?: boolean;
}

export type FormKind =
  | 'matter'
  | 'contact'
  | 'event'
  | 'payment'
  | 'paymentPlan'
  | 'deposit'
  | 'disbursement'
  | 'invite';
export interface FormOverlay {
  kind: FormKind;
  matterId?: string;
  invoiceId?: string;
}

export interface ConfirmDialog {
  title: ReactNode;
  text: ReactNode;
  cta: string;
  tone?: 'primary' | 'destructive-solid';
  onConfirm: () => void;
}

export interface ToastState {
  id: number;
  message: ReactNode;
  action?: string;
  onAction?: () => void;
}

/** Ephemeral overlay state: Capture drawer, ⌘K palette, confirm dialog, toast, alerts popover. */
interface Overlays {
  form: FormOverlay | null;
  openForm: (form: FormOverlay) => void;
  closeForm: () => void;
  capture: { open: boolean; kind: CaptureKind; prefill: CapturePrefill; openedAt: number };
  openCapture: (kind?: CaptureKind, prefill?: CapturePrefill) => void;
  closeCapture: () => void;
  setCaptureKind: (kind: CaptureKind) => void;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  alertsOpen: boolean;
  setAlertsOpen: (open: boolean) => void;
  dialog: ConfirmDialog | null;
  confirm: (dialog: ConfirmDialog) => void;
  closeDialog: () => void;
  toast: ToastState | null;
  notify: (message: ReactNode, action?: string, onAction?: () => void) => void;
  dismissToast: () => void;
  closeAll: () => void;
}

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useOverlays = create<Overlays>()((set) => ({
  form: null,
  openForm: (form) => set({ form, paletteOpen: false, alertsOpen: false }),
  closeForm: () => set({ form: null }),
  capture: { open: false, kind: 'Log time', prefill: {}, openedAt: 0 },
  openCapture: (kind = 'Log time', prefill = {}) =>
    set({
      capture: { open: true, kind, prefill, openedAt: Date.now() },
      alertsOpen: false,
      paletteOpen: false,
    }),
  closeCapture: () => set((s) => ({ capture: { ...s.capture, open: false } })),
  setCaptureKind: (kind) => set((s) => ({ capture: { ...s.capture, kind } })),
  paletteOpen: false,
  openPalette: () => set({ paletteOpen: true, alertsOpen: false }),
  closePalette: () => set({ paletteOpen: false }),
  alertsOpen: false,
  setAlertsOpen: (alertsOpen) => set({ alertsOpen }),
  dialog: null,
  confirm: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  toast: null,
  notify: (message, action, onAction) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, message, action, onAction } });
    toastTimer = setTimeout(() => set({ toast: null }), 4200);
  },
  dismissToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
  closeAll: () =>
    set((s) => ({
      capture: { ...s.capture, open: false },
      paletteOpen: false,
      alertsOpen: false,
      dialog: null,
      form: null,
    })),
}));
