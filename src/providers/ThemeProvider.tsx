import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from '@/theme/colors';

type ThemeValue = { colors: Palette; isDark: boolean };

const ThemeContext = createContext<ThemeValue>({ colors: lightPalette, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<ThemeValue>(
    () => ({
      isDark: scheme === 'dark',
      colors: scheme === 'dark' ? darkPalette : lightPalette,
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
