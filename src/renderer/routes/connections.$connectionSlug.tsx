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
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseListContextProvider } from '../../contexts/DatabaseListContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { TableListContextProvider } from '../../contexts/TableListContext';
import { useTranslation } from '../../i18n';
import DatabaseSelector from '../component/DatabaseSelector';
import { KeyboardShortcut } from '../component/KeyboardShortcut';
import TableList from '../component/TableList';
import { background, foreground } from '../theme';
import NavigateModalContextProvider, {
  useNavigateModalContext,
} from '../useNavigationListener';

const Sider = styled(Layout.Sider)`
  border-right: 1px solid ${foreground};
  background: ${background} !important;
  overflow: auto;
`;

const Content = styled(Layout.Content)`
  overflow: auto;
`;

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug'>;
  request: Request;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug } = params;

  invariant(connectionSlug, 'Connection slug is required');

  window.sql.connectionNameChanged(connectionSlug, undefined);

  const [databaseList] = await window.sql.showDatabases();

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

  const [tableStatusList] = await window.sql.showTableStatus();

  const [keyColumnUsageRows] = await window.sql.getKeyColumnUsage();
  const [allColumns] = await window.sql.getAllColumns();

  return {
    databaseList,
    tableStatusList,
    keyColumnUsageRows,
    allColumns,
  };
}

export default function ConnectionDetailPage() {
  const { databaseList, tableStatusList, keyColumnUsageRows, allColumns } =
    useLoaderData() as Exclude<Awaited<ReturnType<typeof loader>>, Response>;
  const { addConnectionToList } = useConnectionContext();
  const { connectionSlug } = useParams();

  useEffect(() => {
    if (connectionSlug) {
      addConnectionToList(connectionSlug);
    }
  }, [addConnectionToList, connectionSlug]);

  return (
    <DatabaseListContextProvider databaseList={databaseList}>
      <TableListContextProvider tableList={tableStatusList}>
        <ForeignKeysContextProvider keyColumnUsageRows={keyColumnUsageRows}>
          <AllColumnsContextProvider allColumns={allColumns}>
            <NavigateModalContextProvider>
              <Layout>
                <Sider width={200}>
                  <Flex vertical gap="small">
                    <DatabaseSelector databaseList={databaseList} />
                    <OpenNavigateModalButton />
                    <TableList tableStatusList={tableStatusList} />
                  </Flex>
                </Sider>
                <Content>
                  <Outlet />
                </Content>
              </Layout>
            </NavigateModalContextProvider>
          </AllColumnsContextProvider>
        </ForeignKeysContextProvider>
      </TableListContextProvider>
    </DatabaseListContextProvider>
  );
}

function OpenNavigateModalButton() {
  const { t } = useTranslation();
  const { openNavigateModal } = useNavigateModalContext();

  return (
    <Button block size="small" onClick={openNavigateModal}>
      {t('tableList.navigate')}
      <KeyboardShortcut cmdOrCtrl pressedKey="k" />
    </Button>
  );
}
