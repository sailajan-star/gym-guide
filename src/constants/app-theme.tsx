import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { darkPalette, lightPalette, Palette } from './palette';

export type Mode = 'dark' | 'light';
type ThemeValue = { mode: Mode; palette: Palette; toggle: () => void };

const ThemeContext = createContext<ThemeValue>({
  mode: 'dark',
  palette: darkPalette,
  toggle: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then((v) => {
      if (v === 'dark' || v === 'light') setMode(v);
    });
  }, []);

  function toggle() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    AsyncStorage.setItem('themeMode', next);
  }

  return (
    <ThemeContext.Provider
      value={{ mode, palette: mode === 'dark' ? darkPalette : lightPalette, toggle }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Shared small-caps label style
export function labelStyle(p: Palette) {
  return {
    color: p.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  } as const;
}