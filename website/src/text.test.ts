import { describe, expect, it } from 'vitest';
import { SiteLocale } from './siteLocale';
import { createText } from './text';

describe('createText', () => {
  it('words the drawn app in English on a page whose language the app lacks', () => {
    expect(
      createText(SiteLocale.Ja).app('table.rows.count', { count: 1 })
    ).toBe('1 row');
  });

  it('words the drawn app in French on the French page', () => {
    expect(
      createText(SiteLocale.Fr).app('table.rows.count', { count: 1 })
    ).toBe('1 ligne');
  });

  it('formats the numbers of the site in the language of the page', () => {
    expect(
      createText(SiteLocale.De).site('spec.themes.value', { count: 1234 })
    ).toBe('1.234 Themes');
  });
});
