import { describe, expect, it } from 'vitest';
import { SiteLocale, localeOfPath, localePath } from './siteLocale';

describe('localeOfPath', () => {
  it.each([
    ['/', SiteLocale.En],
    ['/fr/', SiteLocale.Fr],
    // the prerender plugin names a page without its trailing slash
    ['/fr', SiteLocale.Fr],
    ['/fr/index.html', SiteLocale.Fr],
    ['/french', SiteLocale.En],
  ])('reads %s as %s', (path, locale) => {
    expect(localeOfPath(path)).toBe(locale);
  });

  it('reads back the path of every locale', () => {
    for (const locale of Object.values(SiteLocale)) {
      expect(localeOfPath(localePath(locale))).toBe(locale);
    }
  });
});
