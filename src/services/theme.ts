/**
 * theme.ts
 * Single source of truth for the CarbonIQ light/dark theme.
 *
 * - Holds one `theme` value and mirrors it onto <html> as the `dark` class
 *   (that class is what tailwind.config.js `darkMode: 'selector'` and the
 *   `:root.dark` palette in index.css key off).
 * - Persists the choice in localStorage under `carbontwin_theme` — the same
 *   key the app has always used — and syncs across browser tabs.
 * - `useTheme()` subscribes consumers with useSyncExternalStore, so every
 *   component reading it re-renders the instant the theme flips.
 * - `useThemeColors()` resolves CSS custom properties into concrete colour
 *   strings for the places where a CSS variable cannot be used directly
 *   (SVG attributes, framer-motion animations).
 */

import { useMemo, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'carbontwin_theme';

/** CarbonIQ ships black + lime, so dark is the default until the user picks. */
export const DEFAULT_THEME: Theme = 'dark';

const listeners = new Set<() => void>();

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function readInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = readStoredTheme();
    if (stored) return stored;
  }
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return DEFAULT_THEME;
}

function applyToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

let currentTheme: Theme = readInitialTheme();

// Guarantee the document matches the store even if the inline bootstrap
// script in index.html was skipped (keeps first paint consistent).
applyToDocument(currentTheme);

function notify(): void {
  listeners.forEach((listener) => listener());
}

function persist(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode) — the theme still applies
    // for this session, it just won't survive a reload.
  }
}

const subscribe = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

export const getTheme = (): Theme => currentTheme;

export const setTheme = (next: Theme): void => {
  if (next === currentTheme) {
    // Still re-assert on the document so callers can recover a lost class.
    applyToDocument(next);
    return;
  }
  currentTheme = next;
  applyToDocument(next);
  persist(next);
  notify();
};

export const toggleTheme = (): void => {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
};

/** Subscribe to the active theme. */
export const useTheme = (): Theme => useSyncExternalStore(subscribe, getTheme, getTheme);

// Keep this tab in sync when another tab changes the theme.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    const next =
      event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : DEFAULT_THEME;
    if (next === currentTheme) return;
    currentTheme = next;
    applyToDocument(next);
    notify();
  });
}

/** Resolve a CSS custom property declared in index.css to a colour string. */
export const readCssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name);
  return value.trim() || fallback;
};

export interface ThemeColors {
  theme: Theme;
  primary: string;
  primaryForeground: string;
  brand2: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
  chartGrid: string;
  chartTick: string;
  chartSaved: string;
  chartEmitted: string;
}

/**
 * Theme colours resolved to literal values. Memoised on the active theme so
 * charts and animations re-read the palette only when it actually changes.
 */
export const useThemeColors = (): ThemeColors => {
  const theme = useTheme();
  return useMemo(
    () => ({
      theme,
      primary: readCssVar('--primary', '#D4E76A'),
      primaryForeground: readCssVar('--primary-foreground', '#0B0B0A'),
      brand2: readCssVar('--brand-2', '#A9B85A'),
      background: readCssVar('--background', '#0B0B0A'),
      foreground: readCssVar('--foreground', '#F5F5EF'),
      card: readCssVar('--card', '#1A1A17'),
      border: readCssVar('--border', '#34342D'),
      chartGrid: readCssVar('--chart-grid', 'rgba(255, 255, 255, 0.05)'),
      chartTick: readCssVar('--chart-tick', '#9ca3af'),
      chartSaved: readCssVar('--chart-1', '#D4E76A'),
      chartEmitted: readCssVar('--chart-emitted', '#ef4444')
    }),
    [theme]
  );
};
