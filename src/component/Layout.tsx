import styled from 'styled-components';
import { Route, Switch, Link } from 'react-router-dom';
import DatabaseSelector from './DatabaseSelector';
import TableList from './TableList';
import TableLayout from './TableLayout';
import ThemeSelector from './ThemeSelector';
import { getSetting } from '../../src/theme';
import ConnectionNav from './Connection/Nav';
import ConnectionPage from './Connection/ConnectionPage';
import ConnectionForm from './Connection/ConnectionForm';
import Debug from './Debug';
import { ReactElement } from 'react';
import {
  Routes,
  createMemoryRouter,
  createRoutesFromElements,
} from 'react-router';

function Home() {
  return (
    <div>
      <p>Welcome to Fuzzy Potato ! </p>

      <Link to="/connect">Please connect</Link>
    </div>
  );
}

function Layout(): ReactElement {
  return (
    <LayoutDiv>
      <Debug />

      <HeaderDiv>
        <h2>Welcome to Fuzzy Potato !</h2>
        <div>
          Theme:
          <ThemeSelector onChangeTheme={onChangeTheme} />
        </div>
      </HeaderDiv>

      <Routes>
        <Route
          // exact
          path="/"
          element={<Home />}
        />
        {/* <Route exact path="/connect">
          <ModalLike>
            <ConnectionPage />
          </ModalLike>
        </Route>
        <Route exact path="/connect/create">
          <ModalLike>
            <ConnectionForm />
          </ModalLike>
        </Route>
        <Route path="/tables">
          <ContentDiv>
            <ConnectionNav />
            <LeftPanelDiv>
              <DatabaseSelector />
              <TableList />
            </LeftPanelDiv>
            <RightPanelDiv>
              <Switch>
                <Route exact path="/tables/:tableName">
                  <TableLayout />
                </Route>
              </Switch>
            </RightPanelDiv>
          </ContentDiv>
        </Route> */}
      </Routes>
    </LayoutDiv>
  );
}

export default Layout;
