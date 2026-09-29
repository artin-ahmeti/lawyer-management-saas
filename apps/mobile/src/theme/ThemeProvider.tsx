import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { View, useColorScheme } from 'react-native';
import { colorScheme as nwColorScheme, vars } from 'nativewind';
import { themeVars, themes, type ThemeName } from '@lawfirm/ui';
import { useThemeStore } from './store';

interface ThemeContextValue {
  /** Resolved scheme after preference + device setting. */
  scheme: ThemeName;
  /** Hex tokens for the resolved scheme (navigation, status bar, icons, charts). */
  theme: (typeof themes)[ThemeName];
  /** Courthouse mode: dark plus quiet behaviour. */
  courthouse: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ scheme: 'light', theme: themes.light, courthouse: false });

/**
 * Applies the Clepso theme to everything below it. Colour utilities in the
 * Tailwind preset resolve through CSS variables, so switching the `vars()`
 * map re-themes every screen without a second class set.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const device = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme: ThemeName =
    preference === 'system' ? (device === 'dark' ? 'dark' : 'light') : preference === 'courthouse' ? 'dark' : preference;

  useEffect(() => {
    nwColorScheme.set(scheme);
  }, [scheme]);

  const style = useMemo(() => vars(themeVars[scheme]), [scheme]);
  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, theme: themes[scheme], courthouse: preference === 'courthouse' }),
    [scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, style]} className="bg-bg">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
