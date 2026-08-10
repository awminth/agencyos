import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

export type ThemePreference = 'light';
export type ResolvedTheme = 'light';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  cycleTheme: () => void;
}

const STORAGE_KEY = 'agency_os_theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyLightTheme() {
  const root = document.documentElement;
  root.classList.remove('dark');
  root.style.colorScheme = 'light';
}

/** Light theme only — dark/system preferences are ignored. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, 'light');
    applyLightTheme();
  }, []);

  const setPreference = useCallback((_pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, 'light');
    applyLightTheme();
  }, []);

  const cycleTheme = useCallback(() => {
    /* Theme locked to light */
  }, []);

  const value = useMemo(
    () => ({
      preference: 'light' as const,
      resolved: 'light' as const,
      setPreference,
      cycleTheme,
    }),
    [setPreference, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
