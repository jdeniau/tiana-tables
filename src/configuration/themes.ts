import * as dracula from '../renderer/theme/dracula.json';
import * as visualStudio from '../renderer/theme/visualStudio.json';
import * as active4d from '../renderer/theme/active4d.json';

export interface TmTheme {
  readonly name: string;
  readonly author?: string;
  readonly settings: TmThemeSetting[];
}

const THEME_LIST_AS_ARRAY: TmTheme[] = [
  dracula,
  visualStudio,
  active4d,
] as const;

const DARK_THEME_LIST_NAME = [dracula.name];

type Theme = (typeof THEME_LIST_AS_ARRAY)[number];

export const THEME_LIST: Record<string, Theme> = {};
THEME_LIST_AS_ARRAY.forEach((t) => {
  THEME_LIST[t.name] = t;
});

export const DEFAULT_THEME = THEME_LIST_AS_ARRAY[0];

export function isDarkTheme(theme: Theme): boolean {
  return DARK_THEME_LIST_NAME.includes(theme.name);
}

export interface TmThemeSetting {
  readonly scope?: string | string[];
  readonly settings: Record<string, string | undefined>;
}

export interface TmThemeScopedSetting extends TmThemeSetting {
  readonly scope: string | string[];
}

export interface TmThemeGlobalSetting extends TmThemeSetting {
  readonly scope: undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isScopedSetting(o: { scope?: any; settings?: any }): boolean {
  return o.scope && o.settings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUnscopedSetting(o: { scope?: any; settings?: any }): boolean {
  return !o.scope && o.settings;
}
