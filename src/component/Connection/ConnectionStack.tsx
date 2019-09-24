import * as React from 'react';
import { Connection } from 'mysql';
import { createConnection } from 'mysql';
import { withRouter, RouteComponentProps } from 'react-router';
import { ConnectionContext } from '../../Contexts';

interface Props extends RouteComponentProps {
  children: React.ReactNode;
}

interface State {
  currentConnection: Connection | null;
}

class ConnectionStack extends React.PureComponent<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.handleConnectTo = this.handleConnectTo.bind(this);
    this.state = {
      currentConnection: null,
    };
  }

  componentWillUnmount() {
    this.disconnect();
  }

  disconnect() {
    if (this.state.currentConnection) {
      this.state.currentConnection.end();
    }
  }

  handleConnectTo(params: object) {
    this.disconnect();
    const currentConnection = createConnection(params);
    currentConnection.connect();
    this.setState({ currentConnection });
    this.props.history.push('/');
  }

  render() {
    const { children } = this.props;
    const { currentConnection } = this.state;
    return (
      <ConnectionContext.Provider
        value={{
          connection: currentConnection,
          connectTo: this.handleConnectTo,
        }}
      >
        {children}>
      </ConnectionContext.Provider>
    );
  }
}

export default withRouter(ConnectionStack);
