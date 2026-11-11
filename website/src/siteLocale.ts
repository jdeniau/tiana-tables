/** The languages of the site as BCP 47 tags, in the order the language menu lists them. */
export enum SiteLocale {
  En = 'en',
  De = 'de',
  Es = 'es',
  Fr = 'fr',
  Ja = 'ja',
  PtBr = 'pt-BR',
  ZhCn = 'zh-CN',
}

/** Each language in its own name: Intl would name zh-CN 中文（中国）, and Node's ICU need not match the browser's. */
export const LOCALE_NAMES: Record<SiteLocale, string> = {
  [SiteLocale.En]: 'English',
  [SiteLocale.De]: 'Deutsch',
  [SiteLocale.Es]: 'Español',
  [SiteLocale.Fr]: 'Français',
  [SiteLocale.Ja]: '日本語',
  [SiteLocale.PtBr]: 'Português (Brasil)',
  [SiteLocale.ZhCn]: '简体中文',
};

/** The path segment of a locale: its tag in lower case, `pt-br` for `pt-BR`. */
function segment(locale: SiteLocale): string {
  return locale.toLowerCase();
}

/** The path a locale's page is served at. */
export function localePath(locale: SiteLocale): string {
  return locale === SiteLocale.En ? '/' : `/${segment(locale)}/`;
}

/** The locale of the page at a path, with or without its trailing slash: `/fr/` and `/fr` are French. */
export function localeOfPath(path: string): SiteLocale {
  return (
    Object.values(SiteLocale).find(
      (locale) =>
        locale !== SiteLocale.En &&
        (path === `/${segment(locale)}` ||
          path.startsWith(`/${segment(locale)}/`))
    ) ?? SiteLocale.En
  );
}
