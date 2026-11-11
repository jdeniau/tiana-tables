import { describe, expect, test } from 'vitest';
import { isAppLocale, localeName } from './locale';

describe('localeName', () => {
  test.each([
    ['en', 'English'],
    ['fr', 'Français'],
  ] as const)('%s is named %s', (locale, name) => {
    expect(localeName(locale)).toBe(name);
  });
});

describe('isAppLocale', () => {
  test.each(['en', 'fr'])('%s is a locale of the app', (locale) => {
    expect(isAppLocale(locale)).toBe(true);
  });

  test.each(['de', 'fr-FR', ''])('%s is not', (locale) => {
    expect(isAppLocale(locale)).toBe(false);
  });
});
