import * as React from 'react';
import { Connection } from 'mysql';
import { createConnection } from 'mysql';
import { useHistory } from 'react-router';
import { History } from 'history';
import { ConnectionContext } from '../../Contexts';

interface PropsWithoutHistory {
  children: React.ReactNode;
}

interface Props extends PropsWithoutHistory {
  history: History;
}

interface State {
  currentConnection: Connection | null;
  connectionList: Connection[];
}

class ConnectionStack extends React.PureComponent<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.handleConnectTo = this.handleConnectTo.bind(this);
    this.handleSetCurrentConnection = this.handleSetCurrentConnection.bind(
      this
    );
    this.state = {
      currentConnection: null,
      connectionList: [],
    };
  }

  componentWillUnmount() {
    this.state.connectionList.forEach(connection => {
      connection.end();
    });
  }

  handleSetCurrentConnection(currentConnection: Connection) {
    this.setState({
      currentConnection,
    });
  }

  // disconnect() {
  //   if (this.state.currentConnection) {
  //     this.state.currentConnection.end();
  //   }
  // }

  handleConnectTo(params: object) {
    // this.disconnect();
    const currentConnection = createConnection(params);
    currentConnection.connect();
    this.setState(prevState => {
      const { connectionList } = prevState;

      connectionList.push(currentConnection);
      return {
        currentConnection,
        connectionList,
      };
    });
    this.props.history.push('/');
  }

  render() {
    const { children } = this.props;
    const { connectionList, currentConnection } = this.state;
    return (
      <ConnectionContext.Provider
        value={{
          connectionList,
          currentConnection,
          connectTo: this.handleConnectTo,
          setCurrentConnection: this.handleSetCurrentConnection,
        }}
      >
        {children}
      </ConnectionContext.Provider>
    );
  }
}

function ConnectionStackWithHistory(props: PropsWithoutHistory) {
  const history = useHistory();

  return <ConnectionStack history={history} {...props} />;
}

export default ConnectionStackWithHistory;
