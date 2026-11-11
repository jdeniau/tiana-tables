import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SiteLocale, localePath } from './siteLocale';

const ORIGIN = 'https://tiana-tables.deniau.me';
const sitemap = readFileSync(
  new URL('../public/sitemap.xml', import.meta.url),
  'utf8'
);

describe('sitemap.xml', () => {
  it('lists the page of every locale', () => {
    const pages = [...sitemap.matchAll(/<loc>(.+?)<\/loc>/g)].map(
      ([, loc]) => loc
    );

    expect(pages).toEqual(
      Object.values(SiteLocale).map(
        (locale) => `${ORIGIN}${localePath(locale)}`
      )
    );
  });

  it('gives each page an alternate per locale, and the English one by default', () => {
    const alternates = [
      ...Object.values(SiteLocale).map(
        (locale) => `hreflang="${locale}" href="${ORIGIN}${localePath(locale)}"`
      ),
      `hreflang="x-default" href="${ORIGIN}/"`,
    ];
    for (const alternate of alternates) {
      expect(sitemap.split(alternate)).toHaveLength(
        Object.values(SiteLocale).length + 1
      );
    }
  });
});
