import { describe, expect, test } from 'vitest';
import { THEME_LIST } from '../../configuration/themes';
import {
  background,
  constantLanguageForeground,
  constantLanguageNullForeground,
  constantNumericForeground,
  foreground,
  selection,
  stringForeground,
  supportTypeForeground,
} from '.';

describe.each(Object.values(THEME_LIST))('style helpers', (theme) => {
  test('foreground', () => {
    expect(foreground({ theme })).toMatchSnapshot(theme.name);
  });

  test('background', () => {
    expect(background({ theme })).toMatchSnapshot(theme.name);
  });

  test('selection', () => {
    expect(selection({ theme })).toMatchSnapshot(theme.name);
  });

  test('stringForeground', () => {
    expect(stringForeground({ theme })).toMatchSnapshot(theme.name);
  });

  test('supportTypeForeground', () => {
    expect(supportTypeForeground({ theme })).toMatchSnapshot(theme.name);
  });

  test('constantLanguageForeground', () => {
    expect(constantLanguageForeground({ theme })).toMatchSnapshot(theme.name);
  });

  test('constantNumericForeground', () => {
    expect(constantNumericForeground({ theme })).toMatchSnapshot(theme.name);
  });

  test('constantLanguageNullForeground', () => {
    expect(constantLanguageNullForeground({ theme })).toMatchSnapshot(
      theme.name
    );
  });
});
