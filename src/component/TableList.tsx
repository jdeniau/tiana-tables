import * as React from 'react';
import { ConnectionContext } from '../Contexts';
import { Connection } from 'mysql';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { getColor } from '../theme/parser';

const StyledNavLink = styled(NavLink)`
  color: ${getColor('support.type', 'foreground')};
`;

interface TableListProps {
  connection: Connection;
}

interface TableStatusRow {
  Name: string;
}

interface TableListState {
  tableStatus: null | TableStatusRow[];
}

class TableList extends React.PureComponent<TableListProps, {}> {
  state: TableListState;

  constructor(props: TableListProps) {
    super(props);

    this.state = {
      tableStatus: null,
    };
  }

  componentDidMount() {
    const { connection } = this.props;

    connection.query('SHOW TABLE STATUS FROM `ticketing`;', (_err, result) => {
      this.setState({
        tableStatus: result,
      });
    });
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
  const connectionConsumer = React.useContext(ConnectionContext);

  if (!connectionConsumer) {
    return null;
  }

  return <TableList connection={connectionConsumer} {...props} />;
}
