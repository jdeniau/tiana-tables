import { ReactElement } from 'react';
import { Menu } from 'antd';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { getSetting } from '../../theme';
import ButtonLink from '../ButtonLink';
import { KeyboardShortcutTooltip } from '../KeyboardShortcut';

const StyledMenu = styled(Menu)`
  flex: 1;
  min-width: 0;
  background-color: ${({ theme }) => getSetting(theme, 'selection')};
`;

export default function Nav(): ReactElement | null {
  const { connectionSlugList, currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();
  const { t } = useTranslation();

  if (!connectionSlugList.length) {
    return null;
  }

  const items = Array.from(connectionSlugList).map((connectionSlug) => {
    if (!configuration.connections[connectionSlug]) {
      return null;
    }

    const connectionName = configuration.connections[connectionSlug].name;

    return {
      key: connectionSlug,
      label: (
        <Link to={`/connections/${connectionSlug}`}>{connectionName}</Link>
      ),
    };
  });

  return (
    <>
      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="n">
        <ButtonLink style={{ margin: '0 10px' }} to="/connect">
          {t('connect.new')}
        </ButtonLink>
      </KeyboardShortcutTooltip>

      <StyledMenu
        mode="horizontal"
        selectedKeys={[currentConnectionSlug ?? '']}
        items={items}
      />
    </>
  );
}
