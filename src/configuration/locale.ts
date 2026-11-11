export const DEFAULT_LOCALE = 'en';

export const LOCALE_LIST = ['en', 'fr'] as const;

export type AppLocale = (typeof LOCALE_LIST)[number];

/** Whether `locale` is one the app is translated into. */
export function isAppLocale(locale: string): locale is AppLocale {
  return LOCALE_LIST.some((appLocale) => appLocale === locale);
}

/** The name of a language in that language, capitalized: `fr` is "Français". */
export function localeName(locale: AppLocale): string {
  const name =
    new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;

  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
