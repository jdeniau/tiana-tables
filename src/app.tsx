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

    this.state = {
      currentConnection: null,
      currentTheme: DEFAULT_THEME,
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

  handleChangeTheme(theme: object) {
    this.setState({
      currentTheme: theme,
    });
  }

  render() {
    const { currentConnection, currentTheme } = this.state;

    return (
      <ConnectionContext.Provider value={currentConnection}>
        <ThemeProvider theme={currentTheme}>
          <Layout onChangeTheme={this.handleChangeTheme} />
        </ThemeProvider>
      </ConnectionContext.Provider>
    );
  }
}
