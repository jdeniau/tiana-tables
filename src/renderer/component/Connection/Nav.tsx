import { ReactElement } from 'react';
import { Menu } from 'antd';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
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
  const { connectionNameList, currentConnectionName } = useConnectionContext();
  const { t } = useTranslation();

  if (!connectionNameList.length) {
    return null;
  }

  const items = Array.from(connectionNameList).map((connection) => ({
    key: connection,
    label: <Link to={`/connections/${connection}`}>{connection}</Link>,
  }));

  return (
    <>
      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="n">
        <ButtonLink style={{ margin: '0 10px' }} to="/connect">
          {t('connect.new')}
        </ButtonLink>
      </KeyboardShortcutTooltip>

      <StyledMenu
        mode="horizontal"
        selectedKeys={[currentConnectionName ?? '']}
        items={items}
      />
    </>
  );
}
