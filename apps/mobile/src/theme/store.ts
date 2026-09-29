import { create } from 'zustand';
import { storage } from '@/lib/storage';

/** system follows the device; courthouse is dark plus quiet-mode behaviour (no sounds, shorter auto-lock). */
export type ThemePreference = 'system' | 'light' | 'dark' | 'courthouse';

const KEY = 'theme.preference';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const initial = (storage.getString(KEY) as ThemePreference | undefined) ?? 'system';

export const useThemeStore = create<ThemeState>((set) => ({
  preference: initial,
  setPreference: (preference) => {
    storage.set(KEY, preference);
    set({ preference });
  },
}));
