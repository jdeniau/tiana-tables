import { useEffect } from 'react';
import { Layout } from 'antd';
import {
  Outlet,
  Params,
  redirect,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { ShowDatabasesResult } from '../../sql/types';
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

interface RouteParams {
  params: Params<'connectionName'>;
  request: Request;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionName } = params;

  invariant(connectionName, 'Connection name is required');

  const [databaseList] = await window.sql.executeQuery<ShowDatabasesResult>(
    connectionName,
    'SHOW DATABASES;'
  );

  const configuration = await window.config.getConfiguration();

  const { activeDatabase: configDatabase, openedTable } =
    configuration.connections[connectionName]?.appState || {};

  const activeDatabase = configDatabase || databaseList[0].Database;

  // redirect to the current database if we are not on a "database" page
  const expectedUrl = `/connections/${connectionName}/${activeDatabase}${
    openedTable ? `/${openedTable}` : ''
  }`;

  if (!request.url.endsWith(expectedUrl)) {
    return redirect(expectedUrl);
  }

  return {
    databaseList,
  };
}

export default function ConnectionDetailPage() {
  const { databaseList } = useLoaderData() as Exclude<
    Awaited<ReturnType<typeof loader>>,
    Response
  >;

  const { addConnectionToList } = useConnectionContext();

  const { connectionName } = useParams();

  useEffect(() => {
    if (connectionName) {
      addConnectionToList(connectionName);
    }
  }, [addConnectionToList, connectionName]);

  return (
    <Layout>
      <Sider width={200} style={{ overflow: 'auto' }}>
        <DatabaseSelector databaseList={databaseList} />
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
