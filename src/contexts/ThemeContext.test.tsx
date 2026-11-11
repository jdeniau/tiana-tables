/**
 * @vitest-environment happy-dom
 */
import type { ReactNode } from 'react';
import { Empty, theme as antdTheme } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { DEFAULT_LOCALE } from '../configuration/locale';
import { DEFAULT_THEME, THEME_LIST } from '../configuration/themes';
import {
  accent,
  background,
  classForeground,
  commentForeground,
  foreground,
  mono,
  selection,
  stringForeground,
  supportForeground,
  variableForeground,
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

const noop = () => {};

/** the static markup of `node` under the providers, with this theme and locale configured */
function renderInProviders(
  node: ReactNode,
  { theme, locale }: { theme: string; locale: string }
): string {
  return renderToStaticMarkup(
    <ConfigurationContext
      value={{
        configuration: {
          version: 1,
          theme,
          locale,
          connections: {},
        },
        addConnectionToConfig: noop,
        editConnection: noop,
        setActiveDatabase: noop,
        setActiveTable: noop,
        setPanelSize: noop,
        setDateDisplay: noop,
        changeLanguage: noop,
      }}
    >
      <ThemeContextProvider>{node}</ThemeContextProvider>
    </ConfigurationContext>
  );
}

function resolveTokens(themeName: string): GlobalToken {
  captured = null;

  renderInProviders(<TokenProbe />, {
    theme: themeName,
    locale: DEFAULT_LOCALE,
  });

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

  test("the semantic colours are the palette's, through the algorithm", () => {
    expect(token.colorError).toBe(variableForeground({ theme }));
    expect(token.colorWarning).toBe(classForeground({ theme }));
    expect(token.colorSuccess).toBe(stringForeground({ theme }));
    expect(token.colorInfo).toBe(supportForeground({ theme }));
    expect(token.colorLink).toBe(supportForeground({ theme }));
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

describe("antd's own words", () => {
  test.each([
    ['en', 'No data'],
    ['fr', 'Aucune donnée'],
    // a locale the app is not translated into
    ['de', 'No data'],
  ])('in %s, an empty state reads %s', (locale, description) => {
    const markup = renderInProviders(<Empty />, {
      theme: DEFAULT_THEME.name,
      locale,
    });

    expect(markup).toContain(description);
  });
});
