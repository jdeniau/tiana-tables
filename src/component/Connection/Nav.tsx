import { Link } from 'react-router-dom';
import { ReactElement, useContext } from 'react';
import { Button, Menu } from 'antd';
import { ConnectionContext } from '../../Contexts';
import { getSetting } from '../../theme';
import { styled } from 'styled-components';

const StyledMenu = styled(Menu)`
  flex: 1;
  min-width: 0;
  background-color: ${({ theme }) => getSetting(theme, 'selection')};
`;

export default function Nav(): ReactElement {
  const {
    connectionNameList,
    setCurrentConnectionName,
    currentConnectionName,
  } = useContext(ConnectionContext);

  if (!connectionNameList.length) {
    return null;
  }

  const items = connectionNameList.map((connection) => ({
    key: connection,
    label: (
      <Link
        onClick={() => {
          setCurrentConnectionName(connection);
        }}
        to="/tables"
      >
        {connection}
      </Link>
    ),
  }));

  return (
    <>
      <Button style={{ margin: '0 10px' }}>
        <Link to="/connect">new…</Link>
      </Button>

      <StyledMenu
        mode="horizontal"
        selectedKeys={[currentConnectionName]}
        items={items}
      />
    </>
  );
}
