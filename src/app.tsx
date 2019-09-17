import * as React from 'react';
import { createConnection, Connection } from 'mysql';
import { ThemeProvider } from 'styled-components';
import Layout from './component/Layout';
import { ConnectionContext } from './Contexts';
import { DEFAULT_THEME } from './theme';

interface AppProps {}

interface AppState {
  currentConnection: Connection | null;
  currentTheme: object;
}

export class App extends React.PureComponent<AppProps, AppState> {
  connection: Connection | null;
  state: AppState;

  constructor(props: AppProps) {
    super(props);

    this.handleChangeTheme = this.handleChangeTheme.bind(this);
    this.handleConnectTo = this.handleConnectTo.bind(this);

    this.state = {
      currentConnection: null,
      currentTheme: DEFAULT_THEME,
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

  handleChangeTheme(theme: object) {
    this.setState({
      currentTheme: theme,
    });
  }

  handleConnectTo(params: object) {
    this.disconnect();

    const currentConnection = createConnection(params);

    currentConnection.connect();

    this.setState({ currentConnection });
  }

  render() {
    const { currentConnection, currentTheme } = this.state;

    return (
      <ConnectionContext.Provider
        value={{
          connection: currentConnection,
          connectTo: this.handleConnectTo,
        }}
      >
        <ThemeProvider theme={currentTheme}>
          <Layout onChangeTheme={this.handleChangeTheme} />
        </ThemeProvider>
      </ConnectionContext.Provider>
    );
  }
}
