import { Button, Splitter } from 'antd';
import {
  LoaderFunctionArgs,
  Outlet,
  Params,
  useLoaderData,
} from 'react-router-dom';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { getDatabaseAppState } from '../../configuration/appState';
import { PANEL } from '../../configuration/panels';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { useDatabaseListContext } from '../../contexts/DatabaseListContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { OpenTablesContextProvider } from '../../contexts/OpenTablesContext';
import { TableListContextProvider } from '../../contexts/TableListContext';
import { useTranslation } from '../../i18n';
import type { ColumnDetail, ForeignKey } from '../../sql/dialect/metadata';
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
  params: Params<'connectionSlug' | 'databaseName'>;
}

interface DatabaseLoaderData {
  connectionSlug: string;
  databaseName: string;
  tableList: Array<string>;
  foreignKeys: Array<ForeignKey>;
  allColumns: Array<ColumnDetail>;
  openTables: Array<string>;
}

export async function loader({
  params,
}: RouteParams): Promise<DatabaseLoaderData> {
  const { connectionSlug, databaseName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');

  window.sql.connectionNameChanged(connectionSlug, databaseName);

  const databaseList = await window.sql.listDatabases();

  // TODO handle the case where the database is not in the databaseList
  if (!databaseList.includes(databaseName)) {
    throw new Error(
      'Database not found in the database list. Case not handled for now.'
    );
  }

  const configuration = await window.config.getConfiguration();

  window.config.setActiveDatabase(connectionSlug, databaseName);

  const tableList = await window.sql.listTables(databaseName);
  const foreignKeys = await window.sql.getForeignKeys(databaseName);
  const allColumns = await window.sql.getAllColumns(databaseName);

  const openTables = pruneOpenTables(
    getDatabaseAppState(configuration, connectionSlug, databaseName)
      ?.openTables ?? [],
    tableList
  );

  return {
    connectionSlug,
    databaseName,
    tableList,
    foreignKeys,
    allColumns,
    openTables,
  };
}

export default function DatabasePage() {
  const { t } = useTranslation();
  const {
    connectionSlug,
    databaseName,
    tableList,
    foreignKeys,
    allColumns,
    openTables,
  } = useLoaderData() as DatabaseLoaderData;
  const databaseList = useDatabaseListContext();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.TABLE_LIST);

  return (
    <TableListContextProvider tableList={tableList}>
      <ForeignKeysContextProvider foreignKeys={foreignKeys}>
        <AllColumnsContextProvider allColumns={allColumns}>
          <OpenTablesContextProvider
            // the open tables are the database's: another database is another run
            key={databaseName}
            connectionSlug={connectionSlug}
            database={databaseName}
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
        </AllColumnsContextProvider>
      </ForeignKeysContextProvider>
    </TableListContextProvider>
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
