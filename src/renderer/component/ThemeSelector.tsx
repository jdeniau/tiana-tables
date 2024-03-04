import { Select } from 'antd';
import { THEME_LIST } from '../../configuration/themes';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeSelector() {
  const { themeName, changeTheme } = useTheme();

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={changeTheme}
      value={themeName}
      options={Object.keys(THEME_LIST).map((key) => ({
        value: key,
        label: key,
      }))}
    />
  );
}
