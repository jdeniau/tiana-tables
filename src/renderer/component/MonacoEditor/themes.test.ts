import { describe, expect, test } from 'vitest';
import { THEME_LIST } from '../../../configuration/themes';
import { convertTextmateThemeToMonaco } from './themes';

describe('convertTextmateThemeToMonaco', () => {
  test.each(Object.keys(THEME_LIST))(
    'should convert %s theme to Monaco theme',
    (themeName) => {
      const theme = THEME_LIST[themeName];
      const monacoTheme = convertTextmateThemeToMonaco(theme);
      expect(monacoTheme).toMatchSnapshot();
    }
  );
});
