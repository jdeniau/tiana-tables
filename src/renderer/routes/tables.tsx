import { Outlet } from 'react-router';
import { styled } from 'styled-components';
import { getSetting } from '../theme';
import DatabaseSelector from '../component/DatabaseSelector';
import TableList from '../component/TableList';
import { Layout } from 'antd';

const Sider = styled(Layout.Sider)`
  border-right: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
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
