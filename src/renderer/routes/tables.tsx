import { Layout } from 'antd';
import { Outlet } from 'react-router';
import { styled } from 'styled-components';
import DatabaseSelector from '../component/DatabaseSelector';
import TableList from '../component/TableList';
import { getSetting } from '../theme';

const Sider = styled(Layout.Sider)`
  border-right: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
  background: ${(props) => getSetting(props.theme, 'background')} !important;
`;

const PaddedDiv = styled.div`
  padding: 10px;
`;

export function Tables() {
  return (
    <Layout>
      <Sider width={200} style={{ overflow: 'auto' }}>
        <DatabaseSelector />
        <PaddedDiv>
          <TableList />
        </PaddedDiv>
      </Sider>
      <Layout.Content style={{ overflow: 'auto' }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
