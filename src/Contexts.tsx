import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { Configuration } from './configuration/type';
import { DEFAULT_THEME, getSetting, isDarkTheme, THEME_LIST } from './theme';

export interface ConnectToFunc {
  (params: object): void;
}
interface ConnexionContextProps {
  currentConnectionName: string | null;
  connectionNameList: string[];
  connectTo: ConnectToFunc;
  setCurrentConnectionName: (connectionName: string) => void;
}
export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionName: null,
  connectionNameList: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  connectTo: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setCurrentConnectionName: () => {},
});

export interface SetDatabaseFunc {
  (theme: string): void;
}
interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDatabase: () => {},
});

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

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const config = useConfiguration();
  const [themeName, setThemeName] = useState(config.theme);

  const changeTheme = (newTheme: string) => {
    window.config.changeTheme(newTheme);
    setThemeName(newTheme);
  };

  const theme = THEME_LIST[themeName];

  return (
    <ThemeProvider theme={theme}>
      <ThemeContext.Provider value={{ themeName, changeTheme }}>
        <ConfigProvider
          theme={{
            token: {
              // Seed Token
              colorPrimary: getSetting(theme, 'foreground'),

              // Alias Token
              colorBgContainer: getSetting(theme, 'background'),
            },
            algorithm: isDarkTheme(theme) ? antdTheme.darkAlgorithm : undefined,
          }}
        >
          {children}
        </ConfigProvider>
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}

const ConfigurationContext = createContext<null | Configuration>(null);

export function ConfigurationContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configuration, setConfiguration] = useState<null | Configuration>(
    null
  );

  useEffect(() => {
    window.config.getConfiguration().then((c) => {
      console.log(c);
      setConfiguration(c);
    });
  }, []);

  console.log(configuration);

  if (!configuration) {
    return null;
  }

  return (
    <ConfigurationContext.Provider value={configuration}>
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfiguration(): Configuration {
  const value = useContext(ConfigurationContext);

  if (!value) {
    throw new Error(
      'useConfiguration must be used within a ConfigurationContextProvider'
    );
  }

  return value;
}
