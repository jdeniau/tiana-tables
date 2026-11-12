import { describe, expect, it } from 'vitest';
import { offeredLocale } from './languageChoice';
import { SiteLocale } from './siteLocale';

describe('offeredLocale', () => {
  it.each([
    [['fr-FR', 'en'], SiteLocale.En, SiteLocale.Fr],
    [['en-US', 'fr'], SiteLocale.En, null],
    [['en-US', 'fr'], SiteLocale.Fr, SiteLocale.En],
    [['fr-CA'], SiteLocale.En, SiteLocale.Fr],
    [['pt-PT'], SiteLocale.En, SiteLocale.PtBr],
    // the first language the site has decides, whatever the script
    [['zh-TW', 'zh', 'en-US'], SiteLocale.En, SiteLocale.ZhCn],
    [['ko', 'ja', 'en'], SiteLocale.En, SiteLocale.Ja],
    [['ko'], SiteLocale.Fr, null],
    [[], SiteLocale.En, null],
    [['not a tag', 'de'], SiteLocale.En, SiteLocale.De],
  ])('offers to %j on a page in %s: %s', (languages, page, offered) => {
    expect(offeredLocale(languages, null, page)).toBe(offered);
  });

  it('offers nothing once the visitor picked a language, on any page', () => {
    expect(offeredLocale(['fr-FR'], SiteLocale.Fr, SiteLocale.En)).toBe(null);
    expect(offeredLocale(['fr-FR'], SiteLocale.En, SiteLocale.En)).toBe(null);
    expect(offeredLocale(['en-US'], SiteLocale.Ja, SiteLocale.Fr)).toBe(null);
  });

  it('ignores a picked value that is not a language of the site', () => {
    expect(offeredLocale(['fr-FR'], 'klingon', SiteLocale.En)).toBe(
      SiteLocale.Fr
    );
  });
});
