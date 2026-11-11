import { describe, expect, it } from 'vitest';
import { SiteLocale, localeOfPath, localePath } from './siteLocale';

describe('localePath', () => {
  it.each([
    [SiteLocale.En, '/'],
    [SiteLocale.Fr, '/fr/'],
    // a region is part of the path, in lower case
    [SiteLocale.PtBr, '/pt-br/'],
    [SiteLocale.ZhCn, '/zh-cn/'],
  ])('serves %s at %s', (locale, path) => {
    expect(localePath(locale)).toBe(path);
  });
});

describe('localeOfPath', () => {
  it.each([
    ['/', SiteLocale.En],
    ['/fr/', SiteLocale.Fr],
    // the prerender plugin names a page without its trailing slash
    ['/fr', SiteLocale.Fr],
    ['/fr/index.html', SiteLocale.Fr],
    ['/french', SiteLocale.En],
    ['/pt-br', SiteLocale.PtBr],
    ['/zh-cn/', SiteLocale.ZhCn],
    ['/pt/', SiteLocale.En],
  ])('reads %s as %s', (path, locale) => {
    expect(localeOfPath(path)).toBe(locale);
  });

  it('reads back the path of every locale', () => {
    for (const locale of Object.values(SiteLocale)) {
      expect(localeOfPath(localePath(locale))).toBe(locale);
    }
  });
});
