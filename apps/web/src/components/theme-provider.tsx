'use client';
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
const changed = 'examspace-theme-changed';
let selection: Theme | undefined;
const valid = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';
function storedTheme(): Theme {
  try {
    const value = localStorage.getItem('theme');
    return valid(value) ? value : 'system';
  } catch {
    return 'system';
  }
}
function snapshot() {
  selection ??= storedTheme();
  const resolved =
    selection === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : selection;
  return selection + ':' + resolved;
}
function subscribe(notify: () => void) {
  const media = matchMedia('(prefers-color-scheme: dark)');
  const storage = (event: StorageEvent) => {
    if (event.key === 'theme' || event.key === null) {
      selection = storedTheme();
      notify();
    }
  };
  window.addEventListener(changed, notify);
  window.addEventListener('storage', storage);
  media.addEventListener('change', notify);
  return () => {
    window.removeEventListener(changed, notify);
    window.removeEventListener('storage', storage);
    media.removeEventListener('change', notify);
  };
}
function setTheme(theme: string) {
  if (!valid(theme)) return;
  selection = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    /* Keep the choice for this document. */
  }
  window.dispatchEvent(new Event(changed));
}
const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme,
});
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const current = useSyncExternalStore(
    subscribe,
    snapshot,
    () => 'system:light',
  );
  const [theme, resolvedTheme] = current.split(':');
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(snapshot().split(':')[1]);
    root.style.colorScheme = snapshot().split(':')[1];
  }, [resolvedTheme]);
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
