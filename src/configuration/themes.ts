import * as NightOwl from '../renderer/theme/Night Owl.tmTheme.json';
import * as active4d from '../renderer/theme/active4d.json';
import * as base16Eva from '../renderer/theme/base16-eva.tmTheme.json';
import * as dracula from '../renderer/theme/dracula.json';
import * as visualStudio from '../renderer/theme/visualStudio.json';

export interface TmTheme {
  readonly name: string;
  readonly author?: string;
  readonly settings: TmThemeSetting[];
}

const THEME_LIST_AS_ARRAY: TmTheme[] = [
  dracula,
  visualStudio,
  active4d,
  NightOwl,
  base16Eva,
] as const;

const DARK_THEME_LIST_NAME = [dracula.name, NightOwl.name, base16Eva.name];

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

export function isScopedSetting(o: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scope?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
}): o is TmThemeScopedSetting {
  return o.scope && o.settings;
}

export function isUnscopedSetting(o: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scope?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
}): o is TmThemeGlobalSetting {
  return !o.scope && o.settings;
}
