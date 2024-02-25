import { createContext, useContext, useEffect, useState } from 'react';
import { styled, ThemeProvider } from 'styled-components';
import { ConfigProvider as AntdConfigProvider, theme as antdTheme } from 'antd';
import { Configuration, ConnectionAppState } from './configuration/type';
import {
  DEFAULT_THEME,
  getColor,
  getSetting,
  isDarkTheme,
  THEME_LIST,
} from './theme';
import { ConnectionObject } from './component/Connection/types';

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
ConnectionContext.displayName = 'ConnectionContext';

export interface SetDatabaseFunc {
  (theme: string): void;
}
interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
  executeQuery: (query: string) => Promise<unknown>;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDatabase: () => {},
  executeQuery: () => Promise.resolve(),
});
DatabaseContext.displayName = 'DatabaseContext';

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

export function useTheme() {
  return useContext(ThemeContext);
}

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

  const changeTheme = (newTheme: string) => {
    window.config.changeTheme(newTheme);
    setThemeName(newTheme);
  };

  const theme = THEME_LIST[themeName];

  return (
    <ThemeProvider theme={theme}>
      <ThemeContext.Provider value={{ themeName, changeTheme }}>
        <AntdConfigProvider
          theme={{
            algorithm: isDarkTheme(theme) ? antdTheme.darkAlgorithm : undefined,
            token: {
              // Seed Token
              colorPrimary: getSetting(theme, 'foreground'),

              // Alias Token
              colorBgContainer: getSetting(theme, 'background'),
            },
            components: {
              Button: {
                colorPrimary: getColor(
                  theme,
                  'constant.language',
                  'foreground'
                ),
                colorLink: getColor(theme, 'support.type', 'foreground'),
                algorithm: true,
              },
            },
          }}
        >
          <LayoutDiv>{children}</LayoutDiv>
        </AntdConfigProvider>
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}

type ConfigurationContextType = {
  configuration: Configuration;
  addConnectionToConfig: (connection: ConnectionObject) => void;
  updateConnectionState: <K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
  ) => void;
};

const ConfigurationContext = createContext<null | ConfigurationContextType>(
  null
);
ConfigurationContext.displayName = 'ConfigurationContext';

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
      setConfiguration(c);
    });
  }, []);

  console.log(configuration);

  if (!configuration) {
    return null;
  }

  const value: ConfigurationContextType = {
    configuration,
    addConnectionToConfig: (connection: ConnectionObject) => {
      window.config.addConnectionToConfig(connection);
    },
    updateConnectionState: <K extends keyof ConnectionAppState>(
      connectionName: string,
      key: K,
      value: ConnectionAppState[K]
    ) => {
      window.config.updateConnectionState(connectionName, key, value);
    },
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfiguration(): ConfigurationContextType {
  const value = useContext(ConfigurationContext);

  if (!value) {
    throw new Error(
      'useConfiguration must be used within a ConfigurationContextProvider'
    );
  }

  return value;
}

export const testables = {
  ConfigurationContext,
};
