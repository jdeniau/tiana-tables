import { ReactElement } from 'react';
import { Button, Menu } from 'antd';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { getSetting } from '../../theme';

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

  const items = connectionNameList.map((connection) => ({
    key: connection,
    label: <Link to={`/connections/${connection}`}>{connection}</Link>,
  }));

  return (
    <>
      <Button style={{ margin: '0 10px' }}>
        <Link to="/connect">{t('connect.new')}</Link>
      </Button>

      <StyledMenu
        mode="horizontal"
        selectedKeys={[currentConnectionName ?? '']}
        items={items}
      />
    </>
  );
}
