import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  ConfigProvider as AntdConfigProvider,
  ThemeConfig,
  theme as antdTheme,
} from 'antd';
import { ThemeProvider, styled } from 'styled-components';
import invariant from 'tiny-invariant';
import {
  DEFAULT_THEME,
  THEME_LIST,
  isDarkTheme,
} from '../configuration/themes';
import {
  background,
  constantLanguageForeground,
  foreground,
  supportTypeForeground,
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

  const antdThemeValue = useMemo(
    (): ThemeConfig => ({
      algorithm: isDarkTheme(theme) ? antdTheme.darkAlgorithm : undefined,
      token: {
        // Seed Token
        colorPrimary: foreground({ theme }),

        // Alias Token
        colorBgContainer: background({ theme }),
      },
      components: {
        Button: {
          colorPrimary: constantLanguageForeground({ theme }),
          colorLink: supportTypeForeground({ theme }),
          algorithm: true,
        },
        Menu: {
          itemHeight: 32,
          itemColor: supportTypeForeground({ theme }),
          padding: 8, // reduce default padding from 16 to 8

          // swap colors for selected item
          itemSelectedBg: supportTypeForeground({ theme }),
          itemSelectedColor: background({ theme }),
        },
      },
    }),
    [theme]
  );

  return (
    <ThemeProvider theme={theme}>
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
