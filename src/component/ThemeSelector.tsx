import * as React from 'react';
import { ThemeContext } from '../Contexts';

const THEME_LIST = ['dracula', 'visualStudio'];

export default function ThemeSelector() {
  return (
    <ThemeContext.Consumer>
      {({ theme, changeTheme }) => (
        <select
          onChange={e => {
            changeTheme(e.target.value);
          }}
          value={theme}
        >
          {THEME_LIST.map(innerTheme => (
            <option key={innerTheme}>{innerTheme}</option>
          ))}
        </select>
      )}
    </ThemeContext.Consumer>
  );
}
