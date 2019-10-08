import { createContext } from 'react';
import { Connection } from 'mysql';

export interface ConnectToFunc {
  (params: object): void;
}
interface ConnexionContextProps {
  currentConnection: Connection | null;
  connectionList: Connection[];
  connectTo: ConnectToFunc;
  setCurrentConnection: (connection: Connection) => void;
}
export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnection: null,
  connectionList: [],
  connectTo: () => {},
  setCurrentConnection: () => {},
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
  theme: string;
  changeTheme: ChangeThemeFunc;
}
export const ThemeContext = createContext<ThemeContextProps>({
  theme: 'dracula',
  changeTheme: () => {},
});
