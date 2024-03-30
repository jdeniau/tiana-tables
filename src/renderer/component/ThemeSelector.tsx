import { Select } from 'antd';
import { THEME_LIST } from '../../configuration/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { background, selection } from '../theme';

export default function ThemeSelector() {
  const { themeName, changeTheme } = useTheme();

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={changeTheme}
      value={themeName}
      options={Object.keys(THEME_LIST)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => ({
          value: key,
          label: (
            <>
              <span
                style={{
                  background: background({ theme: THEME_LIST[key] }),
                  color: selection({ theme: THEME_LIST[key] }),
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
