import * as React from 'react';
import { createConnection, Connection } from 'mysql';
import Layout from './component/Layout';
import { ConnectionContext, ThemeContext } from './Contexts';
import { setCurrentTheme } from './theme/parser';

interface AppProps {}

interface AppState {
  currentConnection: Connection | null;
  currentTheme: string;
}

export class App extends React.PureComponent<AppProps, AppState> {
  connection: Connection | null;
  state: AppState;

  constructor(props: AppProps) {
    super(props);

    this.handleChangeTheme = this.handleChangeTheme.bind(this);

    this.state = {
      currentConnection: null,
      currentTheme: 'dracula',
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

  handleChangeTheme(theme: string) {
    this.setState({
      currentTheme: theme,
    });

    setCurrentTheme(theme);
    this.forceUpdate();
  }

  render() {
    const { currentConnection, currentTheme } = this.state;

    return (
      <ConnectionContext.Provider value={currentConnection}>
        <ThemeContext.Provider
          value={{ theme: currentTheme, changeTheme: this.handleChangeTheme }}
        >
          <Layout />
        </ThemeContext.Provider>
      </ConnectionContext.Provider>
    );
  }
}
