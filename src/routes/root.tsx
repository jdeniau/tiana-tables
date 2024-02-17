import { Outlet } from 'react-router';
import { Link } from 'react-router-dom';
import ConnectionStack from '../component/Connection/ConnectionStack';
import { ThemeContextProvider } from '../Contexts';
import styled from 'styled-components';
import { getSetting } from '../theme';
import Debug from '../component/Debug';
import ThemeSelector from '../component/ThemeSelector';

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

export default function Root() {
  return (
    <ThemeContextProvider>
      <ConnectionStack>
        <LayoutDiv>
          <Debug />

          <HeaderDiv>
            <h2>Welcome to Fuzzy Potato !</h2>
            <div>
              Theme:
              <ThemeSelector />
            </div>
          </HeaderDiv>
          <Outlet />
        </LayoutDiv>
      </ConnectionStack>
    </ThemeContextProvider>
  );
}
