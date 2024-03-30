import {
  TmTheme,
  TmThemeScopedSetting,
  isScopedSetting,
  isUnscopedSetting,
} from '../../configuration/themes';

function getColor(
  currentTheme: TmTheme,
  scopeToFind: string | Array<string>,
  settingToFind: string
): string | undefined {
  const scopeToFindArray = Array.isArray(scopeToFind)
    ? scopeToFind
    : [scopeToFind];

  let item;

  for (const innerScopeToFind of scopeToFindArray) {
    item = currentTheme.settings
      .filter(isScopedSetting)
      .find(({ scope }: TmThemeScopedSetting) => {
        if (Array.isArray(scope)) {
          return scope.includes(innerScopeToFind);
        }
        return scope === innerScopeToFind;
      });
  }

  if (!item) {
    throw new Error(
      `color not found for scope "${scopeToFindArray.join(', ')}"`
    );
  }

  return item.settings[settingToFind];
}

function getSetting(currentTheme: TmTheme, key: string): string | undefined {
  const settings = currentTheme.settings.filter(isUnscopedSetting);

  if (!settings) {
    throw new Error(`color not found settings`);
  }

  return settings[0].settings[key];
}

type StyledProps = { theme: TmTheme };

export const foreground = (props: StyledProps): string | undefined =>
  getSetting(props.theme, 'foreground');

export const background = (props: StyledProps): string | undefined =>
  getSetting(props.theme, 'background');

export const selection = (props: StyledProps): string | undefined =>
  getSetting(props.theme, 'selection');

export const stringForeground = (props: StyledProps): string | undefined =>
  getColor(props.theme, 'string', 'foreground');

export const supportTypeForeground = (props: StyledProps): string | undefined =>
  getColor(props.theme, 'support.type', 'foreground');

export const constantLanguageForeground = (
  props: StyledProps
): string | undefined =>
  getColor(props.theme, 'constant.language', 'foreground');

export const constantNumericForeground = (
  props: StyledProps
): string | undefined =>
  getColor(props.theme, 'constant.numeric', 'foreground');

export const constantLanguageNullForeground = (props: StyledProps) =>
  getColor(
    props.theme,
    ['constant.language.null', 'constant.language'],
    'foreground'
  );
