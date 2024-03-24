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
  params: Params<'connectionSlug'>;
  request: Request;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug } = params;

  invariant(connectionSlug, 'Connection slug is required');

  const [databaseList] = await window.sql.executeQuery<ShowDatabasesResult>(
    connectionSlug,
    'SHOW DATABASES;'
  );

  const configuration = await window.config.getConfiguration();

  const { activeDatabase: configDatabase, activeTableByDatabase } =
    configuration.connections[connectionSlug]?.appState || {};

  const openedTable = configDatabase
    ? activeTableByDatabase?.[configDatabase]
    : undefined;

  if (!databaseList || !databaseList[0]) {
    // TODO handle the case where there is no table in the databbase
    throw new Error('No database found. Case not handled for now.');
  }

  const activeDatabase = configDatabase || databaseList[0].Database;

  // TODO handle the case where the "configDatabase" is not in the databaseList
  if (
    activeDatabase &&
    !databaseList.find((db) => db.Database === activeDatabase)
  ) {
    throw new Error(
      'Database not found in the database list. Case not handled for now.'
    );
  }

  // redirect to the current database if we are not on a "database" page
  const expectedUrl = `/connections/${connectionSlug}/${activeDatabase}${
    openedTable ? `/tables/${openedTable}` : ''
  }`;

  // redirect if we are not on the expected page
  if (
    new URL(request.url).pathname !==
    new URL(expectedUrl, window.location.origin).pathname
  ) {
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

  const { connectionSlug } = useParams();

  useEffect(() => {
    if (connectionSlug) {
      addConnectionToList(connectionSlug);
    }
  }, [addConnectionToList, connectionSlug]);

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