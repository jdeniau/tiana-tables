import { useEffect } from 'react';
import { Button, Flex, Layout } from 'antd';
import {
  LoaderFunctionArgs,
  Outlet,
  Params,
  redirect,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useTranslation } from '../../i18n';
import { ShowDatabasesResult } from '../../sql/types';
import DatabaseSelector from '../component/DatabaseSelector';
import { KeyboardShortcut } from '../component/KeyboardShortcut';
import TableList from '../component/TableList';
import { getSetting } from '../theme';
import { useNavigateModalContext } from '../useNavigationListener';

const Sider = styled(Layout.Sider)`
  border-right: 1px solid ${(props) => getSetting(props.theme, 'foreground')};
  background: ${(props) => getSetting(props.theme, 'background')} !important;
`;

interface RouteParams extends LoaderFunctionArgs {
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

  const { activeDatabase: configDatabase, activeTableByDatabase } =
    configuration.connections[connectionName]?.appState || {};

  const openedTable = configDatabase
    ? activeTableByDatabase?.[configDatabase]
    : undefined;

  const activeDatabase = configDatabase || databaseList[0].Database;

  // redirect to the current database if we are not on a "database" page
  const expectedUrl = `/connections/${connectionName}/${activeDatabase}${
    openedTable ? `/tables/${openedTable}` : ''
  }`;

  if (new URL(request.url).pathname !== expectedUrl) {
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
  const { t } = useTranslation();
  const { openNavigateModal } = useNavigateModalContext();
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
        <Flex vertical gap="small">
          <DatabaseSelector databaseList={databaseList} />
          <Button block size="small" onClick={openNavigateModal}>
            {t('tableList.navigate')}
            <KeyboardShortcut cmdOrCtrl pressedKey="k" />
          </Button>
          <TableList />
        </Flex>
      </Sider>
      <Layout.Content style={{ overflow: 'auto' }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
