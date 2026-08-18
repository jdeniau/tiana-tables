import { describe, expect, test } from 'vitest';
import { THEME_LIST } from '../../../configuration/themes';
import { buildMonacoTheme } from './themes';

describe('buildMonacoTheme', () => {
  test.each(Object.keys(THEME_LIST))(
    'should build a Monaco theme from the %s palette',
    (themeName) => {
      const theme = THEME_LIST[themeName];

      expect(buildMonacoTheme(theme)).toMatchSnapshot();
    }
  );
});
