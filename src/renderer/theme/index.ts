import {
  TmTheme,
  TmThemeScopedSetting,
  isScopedSetting,
  isUnscopedSetting,
} from '../../configuration/themes';

export function getColor(
  currentTheme: TmTheme,
  scopeToFind: string,
  settingToFind: string
): string | undefined {
  const item = currentTheme.settings
    .filter(isScopedSetting)
    .find(({ scope }: TmThemeScopedSetting) => {
      if (Array.isArray(scope)) {
        return scope.includes(scopeToFind);
      }
      return scope === scopeToFind;
    });

  if (!item) {
    throw new Error(`color not found for scope "${scopeToFind}"`);
  }

  return item.settings[settingToFind];
}

export function getSetting(
  currentTheme: TmTheme,
  key: string
): string | undefined {
  const settings = currentTheme.settings.filter(isUnscopedSetting);

  if (!settings) {
    throw new Error(`color not found settings`);
  }

  return settings[0].settings[key];
}
