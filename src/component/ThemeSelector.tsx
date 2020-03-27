import * as React from 'react';
import { ThemeContext } from 'styled-components';
import { THEME_LIST } from '../theme';

interface ThemeSelectorProps {
  onChangeTheme: (theme: object) => void;
}

export default function ThemeSelector({ onChangeTheme }: ThemeSelectorProps) {
  const themeContext = React.useContext(ThemeContext);

  return (
    <select
      onChange={(e) => {
        onChangeTheme(THEME_LIST[e.target.value]);
      }}
      value={themeContext.name}
    >
      {Object.keys(THEME_LIST).map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}
