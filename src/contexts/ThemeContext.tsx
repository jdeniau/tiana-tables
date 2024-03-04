import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getColor, getSetting } from '../renderer/theme';
import {
  isDarkTheme,
  THEME_LIST,
  DEFAULT_THEME,
} from '../configuration/themes';
import { styled, ThemeProvider } from 'styled-components';
import {
  ConfigProvider as AntdConfigProvider,
  ThemeConfig,
  theme as antdTheme,
} from 'antd';
import { useConfiguration } from './ConfigurationContext';
import invariant from 'tiny-invariant';

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
  background: ${(props) => getSetting(props.theme, 'background')};
  color: ${(props) => getSetting(props.theme, 'foreground')};
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
        colorPrimary: getSetting(theme, 'foreground'),

        // Alias Token
        colorBgContainer: getSetting(theme, 'background'),
      },
      components: {
        Button: {
          colorPrimary: getColor(theme, 'constant.language', 'foreground'),
          colorLink: getColor(theme, 'support.type', 'foreground'),
          algorithm: true,
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

export function useTheme() {
  return useContext(ThemeContext);
}
