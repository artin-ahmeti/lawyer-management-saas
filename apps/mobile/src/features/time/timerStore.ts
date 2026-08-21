import { create } from 'zustand';

/**
 * Running-timer state (ephemeral UI state → zustand per CLAUDE.md).
 * Phase 3 persists ticks to MMKV so the timer survives app kill, and stopping
 * POSTs a time entry through the API.
 */
interface TimerState {
  runningSince: number | null;
  matterId: string | null;
  matterTitle: string | null;
  start: (matterId: string, matterTitle: string) => void;
  stop: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  runningSince: null,
  matterId: null,
  matterTitle: null,
  start: (matterId, matterTitle) => set({ runningSince: Date.now(), matterId, matterTitle }),
  stop: () => set({ runningSince: null, matterId: null, matterTitle: null }),
}));
