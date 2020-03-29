import * as React from 'react';
import styled from 'styled-components';
import { Route, Switch, Link } from 'react-router-dom';
import DatabaseSelector from './DatabaseSelector';
import TableList from './TableList';
import TableGrid from './TableGrid';
import ThemeSelector from './ThemeSelector';
import { getSetting } from '../theme';
import ConnectionNav from './Connection/Nav';
import ConnectionForm from './Connection/ConnectionForm';
import Debug from './Debug';

const LayoutDiv = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${(props) => getSetting(props.theme, 'background')};
  color: ${(props) => getSetting(props.theme, 'foreground')};
`;
const HeaderDiv = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 46px;
`;
const ContentDiv = styled.div`
  display: flex;
  flex-grow: 1;
`;
const LeftPanelDiv = styled.div`
  min-width: 200px;
  overflow: auto;
  padding: 0 10px;
  border-left: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
  border-right: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
`;
const RightPanelDiv = styled.div`
  flex-grow: 1;
  overflow: auto;
  padding: 0 10px;
`;
const ModalLike = styled.div`
  width: 50%;
  min-width: 400px;
  align-self: center;
`;

interface LayoutProps {
  onChangeTheme: (theme: object) => void;
}
function Layout({ onChangeTheme }: LayoutProps): React.ReactElement {
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

      <Switch>
        <Route exact path="/">
          <div>
            <p>Welcome to Fuzzy Potato ! </p>

            <Link to="/connect">Please connect</Link>
          </div>
        </Route>
        <Route exact path="/connect">
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
                <Route exact path="/tables/:tableName" component={TableGrid} />
              </Switch>
            </RightPanelDiv>
          </ContentDiv>
        </Route>
      </Switch>
    </LayoutDiv>
  );
}

export default Layout;
