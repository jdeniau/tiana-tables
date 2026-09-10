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
import { fillStyle } from '../renderer/component/Style/fill';
import {
  accent,
  background,
  classForeground,
  commentForeground,
  emphasisForeground,
  fontScale,
  fontSize,
  foreground,
  frame,
  mono,
  mutedForeground,
  selection,
  space,
  stringForeground,
  supportForeground,
  variableForeground,
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
 * What the frame inherits rather than gets from antd: the mono face, the
 * scrollbars — Chromium honours `scrollbar-color`, so no `::-webkit-scrollbar`
 * — and the frame colours, which a tinted title bar re-points on itself
 * (see `frame` in `renderer/theme`).
 */
const GlobalStyle = createGlobalStyle<object>`
  body {
    font-family: ${mono};
    font-size: ${fontSize.base};
    scrollbar-width: thin;
    scrollbar-color: ${selection} ${background};

    --frame-bg: ${background};
    --frame-text: ${foreground};
    --frame-muted: ${commentForeground};
    --frame-emphasis: ${emphasisForeground};
    --frame-accent: ${accent};
  }
`;

/**
 * antd's dark algorithm re-tunes the seed colours for a dark background, and
 * a seed token cannot be pinned from `token`. Every colour comes from the
 * palette, at full strength, so the seeds are put back after the algorithm ran.
 */
const keepPalette: MappingAlgorithm = (seed, map) => ({
  ...(map ?? antdTheme.darkAlgorithm(seed)),
  colorPrimary: seed.colorPrimary,
  colorLink: seed.colorLink,
  colorError: seed.colorError,
  colorWarning: seed.colorWarning,
  colorSuccess: seed.colorSuccess,
  colorInfo: seed.colorInfo,
});

// a splitter fills what holds it, and a panel is a column its single child
// fills — declared here so that no page has to say it again
const SPLITTER = {
  style: fillStyle,
  styles: { panel: { display: 'flex', flexDirection: 'column' } },
} as const;

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
        ? [antdTheme.darkAlgorithm, keepPalette]
        : undefined,
      token: {
        colorPrimary: accent(props),
        colorLink: supportForeground(props),
        // the semantic colours are the palette's, never antd's: errors and
        // deletions, attention, additions, support
        colorError: variableForeground(props),
        colorWarning: classForeground(props),
        colorSuccess: stringForeground(props),
        colorInfo: supportForeground(props),

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
        fontSize: fontScale.base,
        fontSizeSM: fontScale.sm,
        fontSizeLG: fontScale.lg,
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
          // a text button is a muted word that brightens on hover, no fill.
          // Through the frame variables, so the settings affordance follows a
          // tinted title bar; outside one they hold base03 and base05.
          textTextColor: frame.muted,
          textTextHoverColor: frame.text,
          textTextActiveColor: frame.text,
          textHoverBg: 'transparent',
        },
        // the sidebar rows: 24px, 12px mono, no margins, the fill flush to
        // the edges; the label owns the padding, so that the selected row can
        // draw its rule on the left (see `TableList`)
        Menu: {
          itemHeight: 24,
          padding: 8,
          itemBorderRadius: 0,
          itemMarginInline: 0,
          itemMarginBlock: 0,
          itemPaddingInline: 0,
          iconMarginInlineEnd: 0,
          activeBarBorderWidth: 0,
          activeBarWidth: 0,
          fontSize: 12,
          itemColor: colorText,
          itemHoverBg: `color-mix(in srgb, ${colorSelection} 40%, transparent)`,
          itemSelectedBg: colorSelection,
          itemSelectedColor: emphasisForeground(props),
        },
        // form labels read as meta text: the small step, the rule colour,
        // close to their field
        Form: {
          labelFontSize: fontScale.sm,
          labelColor: colorRule,
          verticalLabelPadding: `0 0 ${space.xs}`,
        },
        Layout: {
          headerHeight: 38,
          headerPadding: `0 ${space.md}`,
          // the fill and the text of the title bar are the frame's, and
          // `TitleBar` paints them itself — antd declares its own variables on
          // the `Layout` element, so a `var()` given here is resolved there,
          // above the header that re-points the frame colours
          headerBg: colorBg,
          headerColor: colorText,
          bodyBg: colorBg,
        },
        Tabs: {
          horizontalItemPadding: '0 14px',
        },
        // The bar between two regions is the rule between them. antd paints
        // the line with the item hover colour and the 20px handle with
        // `colorFill`: the line takes the rule colour, the handle the text
        // colour so it stays visible on it, and hover / drag brighten the line.
        Splitter: {
          splitBarSize: 1,
          controlItemBgHover: colorRule,
          controlItemBgActive: colorText,
          controlItemBgActiveHover: accent(props),
          colorFill: colorText,
        },
        // the Data / Chart switch: a filled segment in the muted foreground,
        // the frame is drawn by its owner
        Segmented: {
          fontSize: fontScale.sm,
          trackPadding: 0,
          trackBg: 'transparent',
          itemColor: mutedForeground(props),
          itemHoverColor: colorText,
          itemHoverBg: 'transparent',
          itemActiveBg: 'transparent',
          itemSelectedBg: mutedForeground(props),
          itemSelectedColor: colorBg,
        },
      },
    };
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <ThemeContext.Provider value={themeContextValue}>
        <AntdConfigProvider theme={antdThemeValue} splitter={SPLITTER}>
          <LayoutDiv>{children}</LayoutDiv>
        </AntdConfigProvider>
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}

export function useTheme(): ThemeContextProps {
  return useContext(ThemeContext);
}
