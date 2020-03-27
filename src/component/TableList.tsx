import * as React from 'react';
import { ConnectionContext, DatabaseContext } from '../Contexts';
import { Connection } from 'mysql';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { getColor } from '../theme';

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
}: TableListProps): React.ReactElement | null {
  const [tableStatus, setTableStatus] = React.useState<TableStatusRow[] | null>(
    null
  );
  React.useEffect(() => {
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
            activeClassName="active"
          >
            {rowDataPacket.Name}
          </StyledNavLink>
        </div>
      ))}
    </div>
  );
}

export default function TableList(props: object): React.ReactElement | null {
  const { currentConnection } = React.useContext(ConnectionContext);
  const { database } = React.useContext(DatabaseContext);

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
