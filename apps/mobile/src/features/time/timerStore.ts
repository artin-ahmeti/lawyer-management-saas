import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { storage } from '@/lib/storage';

/**
 * The running timer. Ephemeral UI state lives in zustand (CLAUDE.md), mirrored
 * to MMKV so a timer survives route remounts and an app kill — the courthouse
 * promise is "the timer keeps running". Elapsed time is derived from wall-clock
 * timestamps, never from a tick counter, so backgrounding cannot drift it.
 * Stopping only hands the elapsed minutes to the log-time flow; the time entry
 * itself is written through the API, never from the device.
 */
export interface TimerSnapshot {
  matterId: string | null;
  matterTitle: string | null;
  activity: string | null;
  /** Epoch ms when the current running segment began; null while paused or idle. */
  startedAt: number | null;
  /** Elapsed ms banked by earlier segments (before the last pause). */
  accumulatedMs: number;
}

interface TimerState extends TimerSnapshot {
  /** Start (or restart) the timer; `elapsedMs` seeds an already-running timer. */
  start: (matterId: string, matterTitle: string, activity?: string, elapsedMs?: number) => void;
  pause: () => void;
  resume: () => void;
  /** Clears the timer and returns the total elapsed ms. */
  stop: () => number;
}

const KEY = 'timer.state';
const IDLE: TimerSnapshot = {
  matterId: null,
  matterTitle: null,
  activity: null,
  startedAt: null,
  accumulatedMs: 0,
};

function load(): TimerSnapshot {
  const raw = storage.getString(KEY);
  if (!raw) return IDLE;
  try {
    const parsed = JSON.parse(raw) as Partial<TimerSnapshot>;
    if (typeof parsed.matterId !== 'string') return IDLE;
    return {
      matterId: parsed.matterId,
      matterTitle: typeof parsed.matterTitle === 'string' ? parsed.matterTitle : null,
      activity: typeof parsed.activity === 'string' ? parsed.activity : null,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      accumulatedMs: typeof parsed.accumulatedMs === 'number' ? parsed.accumulatedMs : 0,
    };
  } catch {
    return IDLE;
  }
}

function persist(snapshot: TimerSnapshot): TimerSnapshot {
  storage.set(KEY, JSON.stringify(snapshot));
  return snapshot;
}

const snapshotOf = (s: TimerSnapshot): TimerSnapshot => ({
  matterId: s.matterId,
  matterTitle: s.matterTitle,
  activity: s.activity,
  startedAt: s.startedAt,
  accumulatedMs: s.accumulatedMs,
});

export const elapsedMs = (s: TimerSnapshot, now = Date.now()): number =>
  s.accumulatedMs + (s.startedAt === null ? 0 : Math.max(0, now - s.startedAt));

export const isTimerActive = (s: TimerSnapshot): boolean => s.matterId !== null;
export const isTimerPaused = (s: TimerSnapshot): boolean =>
  s.matterId !== null && s.startedAt === null;
/** True once any timer state has been written on this device (used to seed previews only once). */
export const hasPersistedTimer = (): boolean => storage.contains(KEY);

export const useTimerStore = create<TimerState>((set, get) => ({
  ...load(),
  start: (matterId, matterTitle, activity, elapsedMs = 0) =>
    set(
      persist({
        matterId,
        matterTitle,
        activity: activity ?? null,
        startedAt: Date.now() - Math.max(0, elapsedMs),
        accumulatedMs: 0,
      }),
    ),
  pause: () => {
    const s = get();
    if (s.matterId === null || s.startedAt === null) return;
    set(persist({ ...snapshotOf(s), accumulatedMs: elapsedMs(s), startedAt: null }));
  },
  resume: () => {
    const s = get();
    if (s.matterId === null || s.startedAt !== null) return;
    set(persist({ ...snapshotOf(s), startedAt: Date.now() }));
  },
  stop: () => {
    const total = elapsedMs(get());
    set(persist(IDLE));
    return total;
  },
}));

/** Whole seconds on the timer, re-rendered once a second while it is running. */
export function useTimerSeconds(): number {
  const startedAt = useTimerStore((s) => s.startedAt);
  const accumulatedMs = useTimerStore((s) => s.accumulatedMs);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return Math.floor(
    (accumulatedMs + (startedAt === null ? 0 : Math.max(0, now - startedAt))) / 1000,
  );
}
