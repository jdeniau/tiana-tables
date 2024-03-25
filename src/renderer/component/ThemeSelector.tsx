import { Select } from 'antd';
import { THEME_LIST } from '../../configuration/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { getSetting } from '../theme';

export default function ThemeSelector() {
  const { themeName, changeTheme } = useTheme();

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={changeTheme}
      value={themeName}
      options={Object.keys(THEME_LIST).map((key) => ({
        value: key,
        label: (
          <>
            <span
              style={{
                background: getSetting(THEME_LIST[key], 'background'),
                color: getSetting(THEME_LIST[key], 'selection'),
                marginRight: 4,
                padding: '0 5px 0 4px',
                borderRadius: 2,
              }}
            >
              𝅘𝅥𝅯
            </span>
            {key}
          </>
        ),
      }))}
    />
  );
}
