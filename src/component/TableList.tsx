import { ConnectionContext, DatabaseContext } from '../Contexts';
import type { Connection } from 'mysql';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { getColor } from '../../src/theme';
import { ReactElement, useContext, useEffect, useState } from 'react';

const StyledNavLink = styled(NavLink)`
  color: ${(props) => getColor(props.theme, 'support.type', 'foreground')};
`;

interface TableListProps {
  connection: Connection;
  database: string;
}

interface TableStatusRow {
  Name: string;
}

function ConnectedTableList({
  connection,
  database,
}: TableListProps): ReactElement | null {
  const [tableStatus, setTableStatus] = useState<TableStatusRow[] | null>(null);
  useEffect(() => {
    connection.query(
      `SHOW TABLE STATUS FROM \`${database}\`;`,
      (err, result) => {
        if (err) {
          throw err;
        }

        setTableStatus(result);
      }
    );
  }, [connection, database]);

  if (!tableStatus) {
    return null;
  }

  return (
    <div>
      {tableStatus.map((rowDataPacket: TableStatusRow) => (
        <div key={rowDataPacket.Name}>
          <StyledNavLink
            to={`/tables/${rowDataPacket.Name}`}
            activeStyle={{
              fontWeight: 'bold',
            }}
          >
            {rowDataPacket.Name}
          </StyledNavLink>
        </div>
      ))}
    </div>
  );
}

export default function TableList(props: object): ReactElement | null {
  const { currentConnection } = useContext(ConnectionContext);
  const { database } = useContext(DatabaseContext);

  if (!currentConnection || !database) {
    return null;
  }

  return (
    <ConnectedTableList
      key={`${currentConnection.threadId}|${database}` || undefined}
      connection={currentConnection}
      database={database}
      {...props}
    />
  );
}
