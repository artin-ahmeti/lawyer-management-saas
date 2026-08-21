import { createMMKV } from 'react-native-mmkv';

/** App-wide synchronous KV store: React Query persistence, feature flags, UI prefs. */
export const storage = createMMKV({ id: 'lawfirm' });
