/** The languages of the site, each served at its own path. */
export enum SiteLocale {
  En = 'en',
  Fr = 'fr',
}

/** The path a locale's page is served at. */
export function localePath(locale: SiteLocale): string {
  return locale === SiteLocale.En ? '/' : `/${locale}/`;
}

/** The locale of the page at a path, with or without its trailing slash: `/fr/` and `/fr` are French. */
export function localeOfPath(path: string): SiteLocale {
  return (
    Object.values(SiteLocale).find(
      (locale) =>
        locale !== SiteLocale.En &&
        (path === `/${locale}` || path.startsWith(`/${locale}/`))
    ) ?? SiteLocale.En
  );
}
