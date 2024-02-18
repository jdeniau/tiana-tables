import { createContext, useContext, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { DEFAULT_THEME, THEME_LIST } from './theme';

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
  connectTo: () => {},
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
  const [themeName, setThemeName] = useState(DEFAULT_THEME.name);

  const changeTheme = (newTheme: string) => {
    setThemeName(newTheme);
  };

  return (
    <ThemeProvider theme={THEME_LIST[themeName]}>
      <ThemeContext.Provider value={{ themeName, changeTheme }}>
        {children}
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}
