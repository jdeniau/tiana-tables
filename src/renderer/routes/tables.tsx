import { useCallback, useEffect } from 'react';
import { Layout } from 'antd';
import { Outlet, Params, useParams } from 'react-router';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
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

export default function Tables() {
  //   // TODO move this in the page component
  //   e.preventDefault();

  //   // remove unwanted properties
  //   const { appState: _, ...rest } = connection;

  //   connectTo(rest);
  // }}

  const { connectionName } = useParams();
  const { connectTo } = useConnectionContext();
  const { getConnectionFromName } = useConfiguration();

  useEffect(() => {
    console.log({ connectionName });
  }, [connectionName]);

  useEffect(() => {
    console.log({ getConnectionFromName });
  }, [getConnectionFromName]);

  useEffect(() => {
    console.log({ connectTo });
  }, [connectTo]);

  const doConnect = useCallback(async () => {
    console.log('doConnect', connectionName);
    if (connectionName) {
      const connection = await getConnectionFromName(connectionName);
      await connectTo(connection);
    }
  }, [connectionName]);

  useEffect(() => {
    doConnect();
  }, [doConnect]);

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
