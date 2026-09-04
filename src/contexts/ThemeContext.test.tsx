/**
 * @vitest-environment happy-dom
 */
import { theme as antdTheme } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { DEFAULT_LOCALE } from '../configuration/locale';
import { THEME_LIST } from '../configuration/themes';
import {
  accent,
  background,
  commentForeground,
  foreground,
  mono,
  selection,
} from '../renderer/theme';
import { testables } from './ConfigurationContext';
import { ThemeContextProvider } from './ThemeContext';

const { ConfigurationContext } = testables;

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token'];

let captured: GlobalToken | null = null;

/** reads the token antd resolved from the provider's `ThemeConfig` */
function TokenProbe(): null {
  captured = antdTheme.useToken().token;

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

function resolveTokens(themeName: string): GlobalToken {
  captured = null;

  renderToStaticMarkup(
    <ConfigurationContext.Provider
      value={{
        configuration: {
          version: 1,
          theme: themeName,
          locale: DEFAULT_LOCALE,
          connections: {},
        },
        addConnectionToConfig: noop,
        editConnection: noop,
        setActiveDatabase: noop,
        setActiveTable: noop,
        setPanelSize: noop,
        changeLanguage: noop,
      }}
    >
      <ThemeContextProvider>
        <TokenProbe />
      </ThemeContextProvider>
    </ConfigurationContext.Provider>
  );

  if (!captured) {
    throw new Error('the probe did not render');
  }

  return captured;
}

describe.each(Object.values(THEME_LIST))('antd tokens: $name', (theme) => {
  const token = resolveTokens(theme.name);

  test('the slot contract holds through the algorithm', () => {
    expect(token.colorPrimary).toBe(accent({ theme }));
    expect(token.colorBgContainer).toBe(background({ theme }));
    expect(token.colorBgElevated).toBe(background({ theme }));
    expect(token.colorBgLayout).toBe(background({ theme }));
    expect(token.colorText).toBe(foreground({ theme }));
    expect(token.colorBorder).toBe(commentForeground({ theme }));
    expect(token.colorBorderSecondary).toBe(selection({ theme }));
  });

  test('no shadow, no radius', () => {
    expect(token.boxShadowSecondary).toBe(
      `0 0 0 1px ${commentForeground({ theme })}`
    );
    expect(token.borderRadius).toBe(0);
    expect(token.borderRadiusLG).toBe(0);
    expect(token.borderRadiusSM).toBe(0);
  });

  test('density and type scale', () => {
    expect(token.controlHeight).toBe(24);
    expect(token.controlHeightSM).toBe(20);
    expect(token.fontFamily).toBe(mono);
    expect(token.fontSize).toBe(13);
    // derived: the 11 / 13 / 15 of the type scale
    expect(token.fontSizeSM).toBe(11);
    expect(token.fontSizeLG).toBe(15);
  });
});
