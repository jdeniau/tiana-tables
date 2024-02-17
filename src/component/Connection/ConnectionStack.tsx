import { type Connection } from 'mysql';
import { NavigateFunction, useNavigate } from 'react-router';
import { ConnectionContext, DatabaseContext } from '../../Contexts';
import { PureComponent, ReactNode } from 'react';
import { ConnectionObject } from '.';

interface PropsWithoutHistory {
  children: ReactNode;
}

interface Props extends PropsWithoutHistory {
  navigate: NavigateFunction;
}

interface State {
  currentConnection: Connection | null;
  connectionList: Connection[];
  database: string | null;
}

class ConnectionStack extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.handleConnectTo = this.handleConnectTo.bind(this);
    this.handleSetCurrentConnection = this.handleSetCurrentConnection.bind(
      this
    );
    this.handleSetDatabase = this.handleSetDatabase.bind(this);

    this.state = {
      currentConnection: null,
      connectionList: [],
      database: null,
    };
  }

  componentWillUnmount() {
    this.state.connectionList.forEach((connection) => {
      connection.end();
    });
  }

  handleSetCurrentConnection(currentConnection: Connection) {
    this.setState({
      currentConnection,
    });
  }

  handleSetDatabase(database: string) {
    const { navigate } = this.props;

    this.setState({
      database,
    });

    navigate('/tables');
  }

  // disconnect() {
  //   if (this.state.currentConnection) {
  //     this.state.currentConnection.end();
  //   }
  // }

  async handleConnectTo(params: ConnectionObject) {
    const { navigate } = this.props;

    // this.disconnect();
    console.log('Connecting to', params);
    const currentConnection = await window.sql.createConnection(params);
    currentConnection.connect();
    this.setState((prevState) => {
      const { connectionList } = prevState;

      connectionList.push(currentConnection);
      return {
        currentConnection,
        connectionList,
      };
    });

    navigate('/tables');
  }

  render() {
    const { children } = this.props;
    const { connectionList, currentConnection, database } = this.state;
    return (
      <ConnectionContext.Provider
        value={{
          connectionList,
          currentConnection,
          connectTo: this.handleConnectTo,
          setCurrentConnection: this.handleSetCurrentConnection,
        }}
      >
        <DatabaseContext.Provider
          value={{
            database,
            setDatabase: this.handleSetDatabase,
          }}
        >
          {children}
        </DatabaseContext.Provider>
      </ConnectionContext.Provider>
    );
  }
}

function ConnectionStackWithHistory(props: PropsWithoutHistory) {
  const navigate = useNavigate();

  return <ConnectionStack navigate={navigate} {...props} />;
}

export default ConnectionStackWithHistory;
