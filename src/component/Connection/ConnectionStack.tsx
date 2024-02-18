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
  currentConnectionName: string | null;
  connectionNameList: string[];
  database: string | null;
}

class ConnectionStack extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.handleConnectTo = this.handleConnectTo.bind(this);
    this.handleSetCurrentConnection =
      this.handleSetCurrentConnection.bind(this);
    this.handleSetDatabase = this.handleSetDatabase.bind(this);

    this.state = {
      currentConnectionName: null,
      connectionNameList: [],
      database: null,
    };
  }

  componentWillUnmount() {
    window.sql.closeAllConnections();
    // this.state.connectionNameList.forEach((connection) => {
    //   connection.end();
    // });
  }

  handleSetCurrentConnection(currentConnectionName: string) {
    this.setState({
      currentConnectionName,
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

    const threadId = await window.sql.openConnection(params);

    this.setState((prevState) => {
      const { connectionNameList } = prevState;

      connectionNameList.push(params.name);

      return {
        currentConnectionName: params.name,
        connectionNameList,
      };
    });

    navigate('/tables');
  }

  render() {
    const { children } = this.props;
    const { connectionNameList, currentConnectionName, database } = this.state;
    return (
      <ConnectionContext.Provider
        value={{
          connectionNameList,
          currentConnectionName,
          connectTo: this.handleConnectTo,
          setCurrentConnectionName: this.handleSetCurrentConnection,
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
