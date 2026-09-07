import { describe, expect, test } from 'vitest';
import { THEME_LIST } from '../../configuration/themes';
import {
  accent,
  background,
  backgroundAlt,
  classForeground,
  commentForeground,
  constantForeground,
  emphasisForeground,
  foreground,
  functionForeground,
  keywordForeground,
  mutedForeground,
  selection,
  stringForeground,
  supportForeground,
  variableForeground,
} from '.';

const accessors = {
  background,
  backgroundAlt,
  selection,
  commentForeground,
  mutedForeground,
  foreground,
  emphasisForeground,
  variableForeground,
  constantForeground,
  classForeground,
  stringForeground,
  supportForeground,
  functionForeground,
  keywordForeground,
  accent,
};

describe.each(Object.values(THEME_LIST))('style helpers: $name', (theme) => {
  test.each(Object.entries(accessors))('%s', (_name, accessor) => {
    expect(accessor({ theme })).toMatchSnapshot(theme.name);
  });

  test('every accessor returns a hex color', () => {
    Object.values(accessors).forEach((accessor) => {
      expect(accessor({ theme })).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
