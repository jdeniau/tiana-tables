import { useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import type { UpdateStatus } from '../../main-process/updateCheck';
import useEffectOnce from '../hooks/useEffectOnce';
import { background, commentForeground, space } from '../theme';
import { keyboardShortcutText } from './KeyboardShortcut';
import LangSelector from './LangSelector';
import { TitleIcon } from './Style/TitleBar';
import ThemeSelector from './ThemeSelector';
import VersionBadge from './VersionBadge';

type Props = {
  version: string;
  updateStatus: UpdateStatus;
};

/** the key the native menu binds to the settings, next to the brand */
const SHORTCUT = { cmdOrCtrl: true, pressedKey: ',' };

/** the one popup of the title bar: language, theme, and what version this is */
const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md};
  width: 260px;
  padding: ${space.lg};
  background: ${background};
  box-shadow: 0 0 0 1px ${commentForeground};
`;

const Version = styled.div`
  font-size: 11px;
  color: ${commentForeground};
`;

export default function SettingsMenu({ version, updateStatus }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // the shortcut is an accelerator of the native menu, which the main process
  // relays; Storybook has no bridge to relay from
  useEffectOnce(() => {
    window.navigationListener?.onOpenSettings(() => {
      setOpen((value) => !value);
    });
  });

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomLeft"
      menu={{ items: [] }}
      popupRender={() => (
        <Panel>
          <LangSelector />
          <ThemeSelector />
          <Version>
            <VersionBadge version={version} updateStatus={updateStatus} />
          </Version>
        </Panel>
      )}
    >
      <TitleIcon
        type="text"
        icon={<SettingOutlined />}
        aria-label={t('settings.title')}
        title={`${t('settings.title')} ${keyboardShortcutText(SHORTCUT)}`}
      />
    </Dropdown>
  );
}
