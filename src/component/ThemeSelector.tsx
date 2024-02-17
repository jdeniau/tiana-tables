import { THEME_LIST } from '../../src/theme';
import { useTheme } from '..//Contexts';

export default function ThemeSelector() {
  const { themeName, changeTheme } = useTheme();

  return (
    <select
      onChange={(e) => {
        changeTheme(e.target.value);
      }}
      value={themeName}
    >
      {Object.keys(THEME_LIST).map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}
