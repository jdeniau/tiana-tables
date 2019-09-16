import * as dracula from './dracula.json';
import * as visualStudio from './visualStudio.json';

let currentTheme = dracula;

export function setCurrentTheme(theme: string) {
  console.log(theme);
  switch (theme) {
    case 'dracula':
      currentTheme = dracula;
      break;

    case 'visualStudio':
      currentTheme = visualStudio;
      break;
  }
  console.log(currentTheme.name);
}

interface TmThemeSetting {
  scope?: string | string[];
  settings?: Object;
}

function isScopedSetting(o: { scope?: any; settings?: any }): boolean {
  return o.scope && o.settings;
}

function isUnscopedSetting(o: { scope?: any; settings?: any }): boolean {
  return !o.scope && o.settings;
}

export function getColor(scopeToFind: string, settingToFind: string): string {
  const item = currentTheme.settings
    .filter(isScopedSetting)
    .find(({ scope }: TmThemeSetting) => {
      if (Array.isArray(scope)) {
        return scope.includes(scopeToFind);
      }
      return scope === scopeToFind;
    });

  if (!item) {
    throw new Error(`color not found for scope "${scopeToFind}"`);
  }

  console.log(item.settings[settingToFind]);
  return item.settings[settingToFind];
}

export function getSetting(key: string): string {
  const settings = currentTheme.settings.filter(isUnscopedSetting);

  if (!settings) {
    throw new Error(`color not found settings`);
  }
  console.log(settings[0]);

  return settings[0].settings[key];
}
