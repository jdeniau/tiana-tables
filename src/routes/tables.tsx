import { Outlet } from 'react-router';
import { styled } from 'styled-components';
import { getSetting } from '../theme';
import DatabaseSelector from '../component/DatabaseSelector';
import TableList from '../component/TableList';

const ContentDiv = styled.div`
  display: flex;
  flex-grow: 1;
  overflow: hidden;
`;
const LeftPanelDiv = styled.div`
  min-width: 200px;
  overflow: auto;
  padding: 0 10px;
  border-right: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
`;

const RightPanelDiv = styled.div`
  flex-grow: 1;
  overflow: auto;
  padding: 0 10px;
`;

export function Tables() {
  return (
    <ContentDiv>
      <LeftPanelDiv>
        <DatabaseSelector />
        <TableList />
      </LeftPanelDiv>
      <RightPanelDiv>
        <Outlet />
      </RightPanelDiv>
    </ContentDiv>
  );
}
