'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The running timer. Wall-clock based (never a tick counter), persisted to
 * localStorage so it survives reloads and tab closes — the same contract as
 * the mobile app's timer store. Stopping hands the elapsed minutes to the
 * Capture drawer; the time entry itself is written through the API.
 */
export interface TimerSnapshot {
  matterId: string | null;
  matterTitle: string | null;
  activity: string | null;
  /** Epoch ms when the current running segment began; null while paused or idle. */
  startedAt: number | null;
  /** Elapsed ms banked before the last pause. */
  accumulatedMs: number;
}

interface TimerState extends TimerSnapshot {
  start: (matterId: string, matterTitle: string, activity?: string, elapsedMs?: number) => void;
  pause: () => void;
  resume: () => void;
  /** Clears the timer and returns the total elapsed ms. */
  stop: () => number;
}

const IDLE: TimerSnapshot = {
  matterId: null,
  matterTitle: null,
  activity: null,
  startedAt: null,
  accumulatedMs: 0,
};

export const elapsedMs = (s: TimerSnapshot, at = Date.now()): number =>
  s.accumulatedMs + (s.startedAt === null ? 0 : Math.max(0, at - s.startedAt));
export const isTimerActive = (s: TimerSnapshot): boolean => s.matterId !== null;
export const isTimerPaused = (s: TimerSnapshot): boolean =>
  s.matterId !== null && s.startedAt === null;

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      ...IDLE,
      start: (matterId, matterTitle, activity, elapsed = 0) =>
        set({
          matterId,
          matterTitle,
          activity: activity ?? null,
          startedAt: Date.now() - Math.max(0, elapsed),
          accumulatedMs: 0,
        }),
      pause: () => {
        const s = get();
        if (s.matterId === null || s.startedAt === null) return;
        set({ accumulatedMs: elapsedMs(s), startedAt: null });
      },
      resume: () => {
        const s = get();
        if (s.matterId === null || s.startedAt !== null) return;
        set({ startedAt: Date.now() });
      },
      stop: () => {
        const total = elapsedMs(get());
        set(IDLE);
        return total;
      },
    }),
    {
      name: 'clepso.timer',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        matterId: s.matterId,
        matterTitle: s.matterTitle,
        activity: s.activity,
        startedAt: s.startedAt,
        accumulatedMs: s.accumulatedMs,
      }),
      skipHydration: true,
    },
  ),
);

/** A shared one-second clock so every timer display ticks together. */
const tickListeners = new Set<() => void>();
let tickId: ReturnType<typeof setInterval> | null = null;
function subscribeTick(listener: () => void) {
  tickListeners.add(listener);
  tickId ??= setInterval(() => tickListeners.forEach((l) => l()), 1000);
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  };
}
const nowSecond = () => Math.floor(Date.now() / 1000) * 1000;

/** Whole seconds on the timer, re-rendered once a second while it runs. */
export function useTimerSeconds(): number {
  const startedAt = useTimerStore((s) => s.startedAt);
  const accumulatedMs = useTimerStore((s) => s.accumulatedMs);
  const at = useSyncExternalStore(subscribeTick, nowSecond, () => 0);
  if (startedAt === null) return Math.floor(accumulatedMs / 1000);
  return Math.floor((accumulatedMs + Math.max(0, at - startedAt)) / 1000);
}

/** True once the persisted timer has been read on the client (false during SSR and the first paint). */
export function useTimerHydrated(): boolean {
  useEffect(() => {
    if (!useTimerStore.persist.hasHydrated()) void useTimerStore.persist.rehydrate();
  }, []);
  return useSyncExternalStore(
    (cb) => useTimerStore.persist.onFinishHydration(cb),
    () => useTimerStore.persist.hasHydrated(),
    () => false,
  );
}
