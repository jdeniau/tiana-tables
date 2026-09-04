import { Dropdown } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import type { UpdateStatus } from '../../main-process/updateCheck';
import { background, commentForeground, space } from '../theme';
import LangSelector from './LangSelector';
import { TitleAction } from './Style/TitleBar';
import ThemeSelector from './ThemeSelector';
import VersionBadge from './VersionBadge';

type Props = {
  version: string;
  updateStatus: UpdateStatus;
};

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

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
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
      <TitleAction type="text">{t('settings.title')}</TitleAction>
    </Dropdown>
  );
}
