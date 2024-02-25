import { ConnectionContext, DatabaseContext } from '../Contexts';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';
import { getColor } from '../../src/theme';
import { ReactElement, useContext, useEffect, useState } from 'react';

const StyledNavLink = styled(NavLink)`
  color: ${(props) => getColor(props.theme, 'support.type', 'foreground')};
`;

interface TableListProps {
  database: string;
}

interface TableStatusRow {
  Name: string;
}

function ConnectedTableList({ database }: TableListProps): ReactElement | null {
  const { currentConnectionName } = useContext(ConnectionContext);
  const { executeQuery } = useContext(DatabaseContext);
  const [tableStatusList, setTableStatusList] = useState<
    TableStatusRow[] | null
  >(null);

  useEffect(() => {
    executeQuery(
      // connection.query(
      `SHOW TABLE STATUS FROM \`${database}\`;`
    ).then(([result]) => {
      setTableStatusList(result);
    });
  }, [currentConnectionName, database]);

  if (!tableStatusList) {
    return null;
  }

  return (
    <div>
      {tableStatusList.map((rowDataPacket: TableStatusRow) => (
        <div key={rowDataPacket.Name}>
          <StyledNavLink
            to={`/tables/${rowDataPacket.Name}`}
            style={({ isActive }: { isActive: boolean }) => ({
              fontWeight: isActive ? 'bold' : undefined,
            })}
          >
            {rowDataPacket.Name}
          </StyledNavLink>
        </div>
      ))}
    </div>
  );
}

export default function TableList(props: object): ReactElement | null {
  const { currentConnectionName } = useContext(ConnectionContext);
  const { database } = useContext(DatabaseContext);

  if (!currentConnectionName || !database) {
    return null;
  }

  return (
    <ConnectedTableList
      // key={`${currentConnection.threadId}|${database}` || undefined}
      database={database}
      {...props}
    />
  );
}
