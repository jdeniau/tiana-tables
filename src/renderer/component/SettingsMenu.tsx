import { useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Popover } from 'antd';
import { useTranslation } from '../../i18n';
import useEffectOnce from '../hooks/useEffectOnce';
import { space } from '../theme';
import { keyboardShortcutText } from './KeyboardShortcut';
import LangSelector from './LangSelector';
import { RegionMeta } from './Style/Region';
import ThemeSelector from './ThemeSelector';

type Props = {
  version: string;
};

/** the key the native menu binds to the settings, next to the brand */
const SHORTCUT = { cmdOrCtrl: true, pressedKey: ',' };

/** wide enough for the longest theme name with its preview */
const PANEL_WIDTH = 300;

export default function SettingsMenu({ version }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // the shortcut is an accelerator of the native menu, which the main process
  // relays; Storybook has no bridge to relay from
  useEffectOnce(() =>
    window.navigationListener?.onOpenSettings(() => {
      setOpen((value) => !value);
    })
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      // the one popup of the title bar: language, theme, and what version this is
      content={
        <Flex vertical gap={space.md} style={{ minWidth: PANEL_WIDTH }}>
          <LangSelector />
          <ThemeSelector />
          <RegionMeta>v{version}</RegionMeta>
        </Flex>
      }
    >
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        aria-label={t('settings.title')}
        title={`${t('settings.title')} ${keyboardShortcutText(SHORTCUT)}`}
      />
    </Popover>
  );
}
