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

interface TableListState {
  tableStatus: null | TableStatusRow[];
}

class TableList extends React.PureComponent<TableListProps, TableListState> {
  state: TableListState;

  constructor(props: TableListProps) {
    super(props);

    this.state = {
      tableStatus: null,
    };
  }

  componentDidMount() {
    const { connection, database } = this.props;

    connection.query(
      `SHOW TABLE STATUS FROM \`${database}\`;`,
      (err, result) => {
        if (err) {
          throw err;
        }

        this.setState({
          tableStatus: result,
        });
      }
    );
  }

  render() {
    const { tableStatus } = this.state;

    return (
      <div>
        {tableStatus && (
          <ul>
            {tableStatus.map((rowDataPacket: TableStatusRow) => (
              <li key={rowDataPacket.Name}>
                <StyledNavLink
                  to={`/tables/${rowDataPacket.Name}`}
                  activeClassName="active"
                >
                  {rowDataPacket.Name}
                </StyledNavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

export default function TableListWithContext(props: object) {
  const { currentConnection } = React.useContext(ConnectionContext);
  const { database } = React.useContext(DatabaseContext);

  if (!currentConnection || !database) {
    return null;
  }

  return (
    <TableList
      key={`${currentConnection.threadId}|${database}` || undefined}
      connection={currentConnection}
      database={database}
      {...props}
    />
  );
}
