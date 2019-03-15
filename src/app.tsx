import * as React from 'react';
import { createConnection, Connection, RowDataPacket } from  'mysql';

interface AppProps {
}

export class App extends React.Component<undefined, undefined> {
  connection: ?Connection;

  constructor(props: AppProps) {
    super(props);

    this.connection = null;

    this.state = {
      tableStatus: null,
    };
  }

  componentDidMount() {
    this.connection = createConnection({
      host : 'localhost',
      port: 52880,
      user : 'root',
      password : '',
      database : 'ticketing',
    });

    this.connection.connect();

    this.connection.query('SHOW TABLE STATUS FROM `ticketing`;', (err, result, fields) => {
      console.log(result);
      this.setState({
        tableStatus: result,
      });
    });
  }

  componentWillUnmount() {
    this.connection.end();
  }

  render() {
    const { tableStatus } = this.state;

    if (!tableStatus) {
      return null;
    }

    return (
      <div>
        <h2>Welcome to Fuzzy Potato !</h2>

      <ul>
        {tableStatus.map((rowDataPacket: RowDataPacket) => (
          <li key={rowDataPacket.Name}>
          {rowDataPacket.Name}
          </li>
        )}
      </ul>

      </div>
    );
  }
}
