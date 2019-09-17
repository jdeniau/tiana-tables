import { createContext } from 'react';
import { Connection } from 'mysql';

interface ConnectToFunc {
  (params: object): void;
}
interface ConnexionContextProps {
  connection: Connection | null;
  connectTo: ConnectToFunc;
}
export const ConnectionContext = createContext<ConnexionContextProps>({
  connection: null,
  connectTo: () => {},
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
