import { useMemo } from 'react';
import { Select } from 'antd';
import { styled } from 'styled-components';
import { AppTheme, THEME_LIST } from '../../configuration/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../i18n';
import {
  background,
  commentForeground,
  constantForeground,
  foreground,
  keywordForeground,
  stringForeground,
} from '../theme';

/**
 * Miniature of the theme: its background, a line of "text" and the accents the
 * data grid actually uses, so the preview matches what the user will see.
 */
function ThemePreview({ theme }: { theme: AppTheme }) {
  return (
    <Preview
      $background={background({ theme })}
      $border={commentForeground({ theme })}
    >
      <Bar $color={foreground({ theme })} />
      <Dot $color={stringForeground({ theme })} />
      <Dot $color={constantForeground({ theme })} />
      <Dot $color={keywordForeground({ theme })} />
    </Preview>
  );
}

export default function ThemeSelector() {
  const { t } = useTranslation();
  const { themeName, changeTheme } = useTheme();

  const options = useMemo(() => {
    const toOption = (theme: AppTheme) => ({
      value: theme.name,
      label: (
        <OptionLabel>
          <ThemePreview theme={theme} />
          {theme.name}
        </OptionLabel>
      ),
    });

    const byName = (a: AppTheme, b: AppTheme) => a.name.localeCompare(b.name);
    const themes = Object.values(THEME_LIST);

    return [
      {
        label: t('theme.group.dark'),
        options: themes
          .filter((theme) => theme.variant === 'dark')
          .sort(byName)
          .map(toOption),
      },
      {
        label: t('theme.group.light'),
        options: themes
          .filter((theme) => theme.variant === 'light')
          .sort(byName)
          .map(toOption),
      },
    ];
  }, [t]);

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={changeTheme}
      value={themeName}
      options={options}
      showSearch
      // labels are React elements: search has to run on the theme name
      optionFilterProp="value"
    />
  );
}

const OptionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Preview = styled.span<{ $background: string; $border: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  height: 16px;
  border-radius: 3px;
  background: ${(props) => props.$background};
  border: 1px solid ${(props) => props.$border};
`;

const Bar = styled.span<{ $color: string }>`
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: ${(props) => props.$color};
`;

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => props.$color};
`;
