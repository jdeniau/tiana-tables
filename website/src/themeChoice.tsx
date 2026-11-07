import {
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import { unikittyLight } from '../../src/configuration/palettes/unikittyLight';
import {
  type AppTheme,
  DEFAULT_THEME,
  THEME_LIST,
} from '../../src/configuration/themes';

const STORAGE_KEY = 'theme';

/** Every palette of the app, by name. */
export const PALETTES: ReadonlyArray<AppTheme> = Object.values(THEME_LIST).sort(
  (a, b) => a.name.localeCompare(b.name)
);

/** The palette the visitor picked, null while the page follows the system's light or dark. */
interface ThemeChoice {
  /** The name of the picked palette, null for the system's */
  readonly name: string | null;
  /** Picks a palette by name, or the system's with null */
  pick(name: string | null): void;
}

const ThemeChoiceContext = createContext<ThemeChoice>({
  name: null,
  pick: () => {},
});

export function useThemeChoice(): ThemeChoice {
  return useContext(ThemeChoiceContext);
}

const SLOTS = Object.keys(DEFAULT_THEME.palette) as Array<
  keyof AppTheme['palette']
>;

function paint(theme: AppTheme | undefined): void {
  const { style } = document.documentElement;
  for (const slot of SLOTS) {
    if (theme) {
      style.setProperty(`--${slot}`, theme.palette[slot]);
    } else {
      style.removeProperty(`--${slot}`);
    }
  }
  if (theme) {
    style.setProperty('color-scheme', theme.variant);
  } else {
    style.removeProperty('color-scheme');
  }
}

const listeners = new Set<() => void>();
// where the pick lives when the browser refuses storage
let unstoredPick: string | null = null;

function readPick(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && THEME_LIST[saved] ? saved : null;
  } catch {
    return unstoredPick;
  }
}

function writePick(name: string | null): void {
  unstoredPick = name;
  try {
    if (name) {
      localStorage.setItem(STORAGE_KEY, name);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage blocked: the pick lasts until the page is left
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

const declarations = (theme: AppTheme): string =>
  Object.entries(theme.palette)
    .map(([slot, colour]) => `--${slot}:${colour};`)
    .join('') + `color-scheme:${theme.variant};`;

/** The palettes followed until the visitor picks one: the app's default, and the light one of DESIGN.md. */
export function SystemPalettes(): ReactElement {
  return (
    <style>{`:root{${declarations(DEFAULT_THEME)}}@media (prefers-color-scheme: light){:root{${declarations(unikittyLight)}}}`}</style>
  );
}

/** Paints the page with the picked palette, remembers it, and cycles through them on T. */
export function ThemeChoiceProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  // the page rendered at build follows the system: the pick is read once hydrated
  const name = useSyncExternalStore(subscribe, readPick, () => null);

  useEffect(() => {
    paint(name ? THEME_LIST[name] : undefined);
  }, [name]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() !== 't' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, select, textarea')
      ) {
        return;
      }
      const index = PALETTES.findIndex((theme) => theme.name === name);
      const step = event.shiftKey ? PALETTES.length - 1 : 1;
      writePick(PALETTES[(index + step) % PALETTES.length].name);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [name]);

  return (
    <ThemeChoiceContext.Provider value={{ name, pick: writePick }}>
      {children}
    </ThemeChoiceContext.Provider>
  );
}
