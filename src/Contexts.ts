import { createContext } from 'react';
import { Connection } from 'mysql';

export const ConnectionContext = createContext<Connection | null>(null);

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
