import * as React from 'react';
import { createConnection, Connection } from 'mysql';
import Layout from './component/Layout';
import ConnectionContext from './ConnectionContext';

interface AppProps {}

interface AppState {
  currentConnection: Connection | null;
}

export class App extends React.PureComponent<AppProps, AppState> {
  connection: Connection | null;
  state: AppState;

  constructor(props: AppProps) {
    super(props);

    this.state = {
      currentConnection: null,
    };
  }

  componentDidMount() {
    const currentConnection = createConnection({
      host: null,
      port: null,
      user: null,
      password: null,
      database: null,
    });

    currentConnection.connect();

    this.setState({ currentConnection });
  }

  componentWillUnmount() {
    if (this.state.currentConnection) {
      this.state.currentConnection.end();
      this.forceUpdate();
    }
  }

  render() {
    const { currentConnection } = this.state;
    return (
      <ConnectionContext.Provider value={currentConnection}>
        <Layout />
      </ConnectionContext.Provider>
    );
  }
}
