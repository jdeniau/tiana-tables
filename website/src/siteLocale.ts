/** The languages of the site, each served at its own path. */
export enum SiteLocale {
  En = 'en',
  Fr = 'fr',
}

/** The path a locale's page is served at. */
export function localePath(locale: SiteLocale): string {
  return locale === SiteLocale.En ? '/' : `/${locale}/`;
}
