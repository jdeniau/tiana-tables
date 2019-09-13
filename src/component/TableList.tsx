import * as React from 'react';
import ConnectionContext from '../ConnectionContext';
import { Connection, RowDataPacket } from 'mysql';

interface TableListProps {
  connection: Connection;
}

interface TableListState {
  tableStatus: null | RowDataPacket[];
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

    connection.query(
      'SHOW TABLE STATUS FROM `ticketing`;',
      (err, result, fields) => {
        console.log(result);
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
            {tableStatus.map((rowDataPacket: RowDataPacket) => (
              <li key={rowDataPacket.Name}>{rowDataPacket.Name}</li>
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
