import * as React from 'react';
import styled from 'styled-components';
import { Route, Switch } from 'react-router-dom';
import TableList from './TableList';
import TableGrid from './TableGrid';
import ThemeSelector from './ThemeSelector';
import { getSetting } from '../theme';
import ConnectionNav from './Connection/Nav';
import ConnectionForm from './Connection/ConnectionForm';

const LayoutDiv = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => getSetting(props.theme, 'background')};
  color: ${props => getSetting(props.theme, 'foreground')};
`;
const HeaderDiv = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const ContentDiv = styled.div`
  display: flex;
  flex-grow: 1;
`;
const LeftPanelDiv = styled.div`
  min-width: 200px;
  overflow: auto;
`;
const RightPanelDiv = styled.div`
  flex-grow: 1;
  overflow: auto;
`;

interface LayoutProps {
  onChangeTheme: (theme: object) => void;
}
const Layout = ({ onChangeTheme }: LayoutProps) => {
  return (
    <LayoutDiv>
      <HeaderDiv>
        <h2>Welcome to Fuzzy Potato !</h2>
        <div>
          Theme:
          <ThemeSelector onChangeTheme={onChangeTheme} />
        </div>
      </HeaderDiv>
      <ConnectionNav />
      <ContentDiv>
        <Switch>
          <Route exact path="/connect">
            <ConnectionForm />
          </Route>
          <Route>
            <LeftPanelDiv>
              <TableList />
            </LeftPanelDiv>
            <RightPanelDiv>
              <Switch>
                <Route exact path="/tables/:tableName" component={TableGrid} />
              </Switch>
            </RightPanelDiv>
          </Route>
        </Switch>
      </ContentDiv>
    </LayoutDiv>
  );
};

export default Layout;
