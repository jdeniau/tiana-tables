import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ConfigProvider as AntdConfigProvider,
  type MappingAlgorithm,
  ThemeConfig,
  theme as antdTheme,
} from 'antd';
import { ThemeProvider, createGlobalStyle, styled } from 'styled-components';
import invariant from 'tiny-invariant';
import {
  DEFAULT_THEME,
  THEME_LIST,
  isDarkTheme,
} from '../configuration/themes';
import {
  accent,
  background,
  commentForeground,
  emphasisForeground,
  foreground,
  mono,
  selection,
  supportForeground,
} from '../renderer/theme';
import { useConfiguration } from './ConfigurationContext';

interface ChangeThemeFunc {
  (theme: string): void;
}
interface ThemeContextProps {
  themeName: string;
  changeTheme: ChangeThemeFunc;
}
const ThemeContext = createContext<ThemeContextProps>({
  themeName: DEFAULT_THEME.name,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  changeTheme: () => {},
});
ThemeContext.displayName = 'ThemeContext';

/**
 * What the frame inherits rather than gets from antd: the mono face, and the
 * scrollbars — Chromium honours `scrollbar-color`, so no `::-webkit-scrollbar`.
 */
const GlobalStyle = createGlobalStyle<object>`
  body {
    font-family: ${mono};
    font-size: 13px;
    scrollbar-width: thin;
    scrollbar-color: ${selection} ${background};
  }
`;

/**
 * antd's dark algorithm re-tunes the primary colour for a dark background,
 * and a seed token cannot be pinned from `token`. The accent is a mark at
 * full strength, so the seed is put back after the algorithm ran.
 */
const keepAccent: MappingAlgorithm = (seed, map) => ({
  ...(map ?? antdTheme.darkAlgorithm(seed)),
  colorPrimary: seed.colorPrimary,
});

const LayoutDiv = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${background};
  color: ${foreground};
`;

export function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { configuration } = useConfiguration();
  const [themeName, setThemeName] = useState(configuration.theme);

  useEffect(() => {
    setThemeName(configuration.theme);
  }, [configuration.theme]);

  const changeTheme = useCallback((newTheme: string) => {
    window.config.changeTheme(newTheme);
    setThemeName(newTheme);
  }, []);

  const theme = THEME_LIST[themeName];

  invariant(theme, `Theme ${themeName} not found`);

  const themeContextValue = useMemo(
    () => ({ themeName, changeTheme }),
    [changeTheme, themeName]
  );

  // antd owns the components: density, radius, heights, and the slot contract
  // of DESIGN.md. Layout values live next to the accessors in `renderer/theme`.
  const antdThemeValue = useMemo((): ThemeConfig => {
    const props = { theme };
    const colorBg = background(props);
    const colorSelection = selection(props);
    const colorRule = commentForeground(props);
    const colorText = foreground(props);
    // a hairline where antd would cast a shadow: lines, not layers
    const hairline = `0 0 0 1px ${colorRule}`;

    return {
      algorithm: isDarkTheme(theme)
        ? [antdTheme.darkAlgorithm, keepAccent]
        : undefined,
      token: {
        colorPrimary: accent(props),
        colorLink: supportForeground(props),

        // one background — the algorithms would lift containers and popups
        colorBgBase: colorBg,
        colorBgContainer: colorBg,
        colorBgElevated: colorBg,
        colorBgLayout: colorBg,

        colorTextBase: colorText,
        colorText,
        colorTextSecondary: colorRule,
        colorTextTertiary: colorRule,
        colorTextDescription: colorRule,
        colorTextPlaceholder: colorRule,

        colorBorder: colorRule,
        colorSplit: colorRule,
        colorBorderSecondary: colorSelection,
        controlItemBgActive: colorSelection,
        controlItemBgActiveHover: colorSelection,

        boxShadow: hairline,
        boxShadowSecondary: hairline,
        boxShadowTertiary: hairline,

        // focus ring: 1px accent, no glow
        controlOutline: accent(props),
        controlOutlineWidth: 1,
        lineWidthFocus: 1,

        controlHeight: 24,
        controlHeightSM: 20,
        borderRadius: 0,
        fontSize: 13,
        // antd would derive 10 and 14: the type scale is 11 / 13 / 15
        fontSizeSM: 11,
        fontSizeLG: 15,
        fontFamily: mono,
        fontFamilyCode: mono,
        padding: 8,
        paddingXS: 4,
        margin: 8,

        motionDurationFast: '0.12s',
        motionDurationMid: '0.12s',
        motionDurationSlow: '0.12s',
      },
      components: {
        Button: {
          // base00 on base0D reads on every palette; white does not on Dracula
          primaryColor: colorBg,
        },
        Menu: {
          itemHeight: 24,
          padding: 8,
          itemBorderRadius: 0,
          itemMarginInline: 0,
          itemMarginBlock: 0,
          activeBarBorderWidth: 0,
          activeBarWidth: 0,
          fontSize: 12,
          itemColor: colorText,
          itemSelectedBg: colorSelection,
          itemSelectedColor: emphasisForeground(props),
        },
        Tabs: {
          horizontalItemPadding: '0 14px',
        },
      },
    };
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <ThemeContext.Provider value={themeContextValue}>
        <AntdConfigProvider theme={antdThemeValue}>
          <LayoutDiv>{children}</LayoutDiv>
        </AntdConfigProvider>
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}

export function useTheme(): ThemeContextProps {
  return useContext(ThemeContext);
}
