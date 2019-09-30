import * as dracula from '../theme/dracula.json';
import * as visualStudio from '../theme/visualStudio.json';
import * as active4d from '../theme/active4d.json';

const THEME_LIST_AS_ARRAY = [dracula, visualStudio, active4d];

export const THEME_LIST = {};
THEME_LIST_AS_ARRAY.forEach(t => {
  THEME_LIST[t.name] = t;
});

export const DEFAULT_THEME = THEME_LIST_AS_ARRAY[0];

interface TmTheme {
  readonly name: string;
  readonly author?: string;
  readonly settings: TmThemeSetting[];
}

interface TmThemeSetting {
  readonly scope?: string | string[];
  readonly settings: Record<string, string>;
}

interface TmThemeScopedSetting extends TmThemeSetting {
  readonly scope: string | string[];
}

interface TmThemeGlobalSetting extends TmThemeSetting {
  readonly scope: undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isScopedSetting(o: { scope?: any; settings?: any }): boolean {
  return o.scope && o.settings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUnscopedSetting(o: { scope?: any; settings?: any }): boolean {
  return !o.scope && o.settings;
}

export function getColor(
  currentTheme: TmTheme,
  scopeToFind: string,
  settingToFind: string
): string {
  const item = currentTheme.settings
    .filter(isScopedSetting)
    .find(({ scope }: TmThemeSetting) => {
      if (Array.isArray(scope)) {
        return scope.includes(scopeToFind);
      }
      return scope === scopeToFind;
    }) as TmThemeScopedSetting;

  if (!item) {
    throw new Error(`color not found for scope "${scopeToFind}"`);
  }

  return item.settings[settingToFind];
}

export function getSetting(currentTheme: TmTheme, key: string): string {
  const settings = currentTheme.settings.filter(
    isUnscopedSetting
  ) as TmThemeGlobalSetting[];

  if (!settings) {
    throw new Error(`color not found settings`);
  }

  return settings[0].settings[key];
}
