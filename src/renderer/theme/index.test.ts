import { describe, expect, test } from 'vitest';
import { THEME_LIST } from '../../configuration/themes';
import {
  background,
  backgroundAlt,
  classForeground,
  commentForeground,
  constantForeground,
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
  variableForeground,
  constantForeground,
  classForeground,
  stringForeground,
  supportForeground,
  functionForeground,
  keywordForeground,
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
