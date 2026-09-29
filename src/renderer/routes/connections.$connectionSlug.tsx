import { useEffect } from 'react';
import { Button, Splitter } from 'antd';
import {
  LoaderFunctionArgs,
  Outlet,
  Params,
  redirect,
  useLoaderData,
} from 'react-router-dom';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { getConnectionAppState } from '../../configuration/appState';
import { PANEL } from '../../configuration/panels';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseListContextProvider } from '../../contexts/DatabaseListContext';
import { DateDisplayContextProvider } from '../../contexts/DateDisplayContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { OpenTablesContextProvider } from '../../contexts/OpenTablesContext';
import { TableListContextProvider } from '../../contexts/TableListContext';
import { useTranslation } from '../../i18n';
import DatabaseSelector from '../component/DatabaseSelector';
import { KeyboardShortcut } from '../component/KeyboardShortcut';
import { RegionBody, RegionFoot } from '../component/Style/Region';
import { fill } from '../component/Style/fill';
import TableList from '../component/TableList';
import TableTabs from '../component/TableTabs';
import { pruneOpenTables } from '../component/openTables';
import { usePanelSize } from '../hooks/usePanelSize';
import { commentForeground, fontSize, space } from '../theme';
import NavigateModalContextProvider, {
  useNavigateModalContext,
} from '../useNavigationListener';

// The sidebar: the database name, the way to a table, the tables, their count.
// The rule on its right is the bar of the splitter, not a border of its own.
const Sider = styled.div`
  ${fill}
  display: flex;
  flex-direction: column;
`;

const SiderHead = styled.div`
  display: flex;
  align-items: center;
  padding: ${space.md} ${space.md} 0;
`;

const SiderTools = styled.div`
  padding: ${space.md};
`;

/** looks like the input it stands for, opens the table palette */
const GoToTable = styled(Button)`
  &&& {
    justify-content: space-between;
    font-size: ${fontSize.sm};
    color: ${commentForeground};
  }
`;

// every page it hosts fills it and scrolls inside itself: a second scroller
// here would carry a region's own scrollbar out of the viewport
const Content = styled.div`
  ${fill}
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

interface RouteParams extends LoaderFunctionArgs {
  /** `databaseName` when the URL goes on to a database */
  params: Params<'connectionSlug'> & Partial<Params<'databaseName'>>;
  request: Request;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug, databaseName } = params;

  invariant(connectionSlug, 'Connection slug is required');

  // The database is not known yet: it is resolved below.
  window.sql.connectionNameChanged(connectionSlug, undefined);

  const databaseList = await window.sql.listDatabases();

  const configuration = await window.config.getConfiguration();

  const { activeDatabase: configDatabase, configByDatabase } =
    getConnectionAppState(configuration, connectionSlug) || {};

  if (!databaseList || !databaseList[0]) {
    // TODO handle the case where there is no table in the databbase
    throw new Error('No database found. Case not handled for now.');
  }

  // the URL's first: the `$databaseName` loader, run alongside, may not have stored it yet
  const activeDatabase = databaseName || configDatabase || databaseList[0];

  const databaseConfig = configByDatabase?.[activeDatabase];

  // TODO handle the case where the "activeDatabase" is not in the databaseList
  if (activeDatabase && !databaseList.includes(activeDatabase)) {
    throw new Error(
      'Database not found in the database list. Case not handled for now.'
    );
  }

  // Announce the database we resolved. The child `$databaseName` loader
  // announces it too, but both loaders run in parallel, so this one cannot
  // leave the main process on the `undefined` it set above.
  window.sql.connectionNameChanged(connectionSlug, activeDatabase);

  // a URL naming its database is followed as it is: a link opens a table of another one
  if (!databaseName) {
    const openedTable = databaseConfig?.activeTable;
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
  }

  const tableList = await window.sql.listTables(activeDatabase);
  // a key to a database the user cannot open would link to an error page
  const foreignKeys = (await window.sql.getForeignKeys(activeDatabase)).filter(
    (key) => databaseList.includes(key.referencedDatabase)
  );
  const allColumns = await window.sql.getAllColumns(activeDatabase);
  const serverTimeZone = await window.sql.getServerTimeZone();

  return {
    connectionSlug,
    databaseList,
    tableList,
    foreignKeys,
    allColumns,
    activeDatabase,
    serverTimeZone,

    openTables: pruneOpenTables(databaseConfig?.openTables ?? [], tableList),
  };
}

export default function ConnectionDetailPage() {
  const { t } = useTranslation();
  const {
    connectionSlug,
    databaseList,
    tableList,
    foreignKeys,
    allColumns,
    activeDatabase,
    serverTimeZone,
    openTables,
  } = useLoaderData() as Exclude<Awaited<ReturnType<typeof loader>>, Response>;
  const { addConnectionToList } = useConnectionContext();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.TABLE_LIST);

  useEffect(() => {
    if (connectionSlug) {
      addConnectionToList(connectionSlug);
    }
  }, [addConnectionToList, connectionSlug]);

  return (
    <DatabaseListContextProvider databaseList={databaseList}>
      <TableListContextProvider tableList={tableList}>
        <ForeignKeysContextProvider
          foreignKeys={foreignKeys}
          database={activeDatabase}
        >
          <AllColumnsContextProvider allColumns={allColumns}>
            <DateDisplayContextProvider serverTimeZone={serverTimeZone}>
              <OpenTablesContextProvider
                // the open tables are the database's: another database is another run
                key={activeDatabase}
                connectionSlug={connectionSlug}
                database={activeDatabase}
                openTables={openTables}
              >
                <NavigateModalContextProvider>
                  <Splitter onResizeEnd={onResizeEnd}>
                    <Splitter.Panel {...panelProps}>
                      <Sider>
                        <SiderHead>
                          <DatabaseSelector databaseList={databaseList} />
                        </SiderHead>
                        <SiderTools>
                          <OpenNavigateModalButton />
                        </SiderTools>
                        <RegionBody>
                          <TableList tableList={tableList} />
                        </RegionBody>
                        <RegionFoot>
                          {t('tableList.count', {
                            count: tableList.length,
                          })}
                        </RegionFoot>
                      </Sider>
                    </Splitter.Panel>
                    <Splitter.Panel>
                      <Content>
                        <TableTabs />
                        <Outlet />
                      </Content>
                    </Splitter.Panel>
                  </Splitter>
                </NavigateModalContextProvider>
              </OpenTablesContextProvider>
            </DateDisplayContextProvider>
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
    <GoToTable
      block
      variant="outlined"
      color="default"
      onClick={openNavigateModal}
    >
      <span>{t('tableList.navigate')}</span>
      <KeyboardShortcut cmdOrCtrl pressedKey="k" />
    </GoToTable>
  );
}
