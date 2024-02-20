import { Select } from 'antd';
import { THEME_LIST } from '../../src/theme';
import { useTheme } from '../Contexts';

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
