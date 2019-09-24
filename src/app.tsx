import * as React from 'react';
import { MemoryRouter as Router } from 'react-router';
import { ThemeProvider } from 'styled-components';
import Layout from './component/Layout';
import { DEFAULT_THEME } from './theme';
import ConnectionStack from './component/Connection/ConnectionStack';

// A possibility is also to create history manually to call `history.push('/path')`
// import { createMemoryHistory } from 'history';
// export const history = createMemoryHistory();
// <Router history={history}>

export interface AppProps {}

interface AppState {
  currentTheme: object;
}

export class App extends React.PureComponent<AppProps, AppState> {
  state: AppState;

  constructor(props: AppProps) {
    super(props);

    this.handleChangeTheme = this.handleChangeTheme.bind(this);

    this.state = {
      currentTheme: DEFAULT_THEME,
    };
  }

  handleChangeTheme(theme: object) {
    this.setState({
      currentTheme: theme,
    });
  }

  render() {
    const { currentTheme } = this.state;

    return (
      <Router>
        <ConnectionStack>
          <ThemeProvider theme={currentTheme}>
            <Layout onChangeTheme={this.handleChangeTheme} />
          </ThemeProvider>
        </ConnectionStack>
      </Router>
    );
  }
}
