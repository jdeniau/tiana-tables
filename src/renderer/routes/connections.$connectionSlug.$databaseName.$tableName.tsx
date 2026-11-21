import { QueryClient, noop } from '@tanstack/react-query';
import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import { getDatabaseAppState } from '../../configuration/appState';
import type { DisplayAfterByTable } from '../../configuration/columnOrder';
import type { ColumnWidthByColumn } from '../../configuration/type';
import TableLayout from '../component/TableLayout';
import { tableRowsQuery } from '../component/TableLayout/tableRowsQuery';
import { readOrderParams } from '../component/TableLayout/tableSearch';
import { loadDialect } from '../hooks/useDialect';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

export const loader =
  (queryClient: QueryClient) =>
  async ({ params, request }: RouteParams) => {
    const { connectionSlug, databaseName, tableName } = params;

    invariant(connectionSlug, 'Connection slug is required');
    invariant(databaseName, 'Database name is required');
    invariant(tableName, 'Table name is required');

    const dialect = await loadDialect(connectionSlug);

    window.sql.connectionNameChanged(connectionSlug, databaseName);

    const primaryKeys = await window.sql.getPrimaryKeyColumns(
      databaseName,
      tableName
    );

    window.config.setActiveTable(connectionSlug, databaseName, tableName);

    const configuration = await window.config.getConfiguration();

    const tables =
      getDatabaseAppState(configuration, connectionSlug, databaseName)
        ?.tables ?? {};
    const tableConfig = tables[tableName];

    const storedFilter = tableConfig?.currentFilter || '';
    const columnWidthByColumn: ColumnWidthByColumn =
      tableConfig?.columnWidthByColumn ?? {};
    // read here: the configuration's context does not see the order the structure page writes
    const displayAfterByTable: DisplayAfterByTable = Object.fromEntries(
      Object.entries(tables).map(([table, config]) => [
        table,
        config.displayAfterByColumn ?? {},
      ])
    );

    const searchParams = new URL(request.url).searchParams;

    // An empty `where` param is a filter the user just cleared, not an absent
    // one: only fall back to the stored filter when the param is not there.
    const whereParam = searchParams.get('where');

    // A filter is its clause, and a clause of blank is no filter: left as it
    // came it would go out as `WHERE   LIMIT 100`, be stored, and fail again at
    // every opening of the table. This is the one door filters come through —
    // the form, the grid's context menu and the history all post `?where`.
    const where = (whereParam ?? storedFilter).trim();

    // the write answers the history it just pushed the filter into, so the page
    // and the file never hold two versions of it
    const filterHistory = await window.config.setTableFilter(
      connectionSlug,
      databaseName,
      tableName,
      where
    );

    // the order the headers write, kept like the filter: `order=` is a sort removed
    const sorting = readOrderParams(searchParams) ?? tableConfig?.sorting ?? [];

    window.config.setTableSorting(
      connectionSlug,
      databaseName,
      tableName,
      sorting
    );

    // not awaited, so the page shows its skeleton meanwhile; a table already in the cache sends nothing here
    queryClient
      .infiniteQuery({
        ...tableRowsQuery(dialect, connectionSlug, {
          database: databaseName,
          tableName,
          primaryKeys,
          where,
          sorting,
        }),
        staleTime: 'static',
      })
      .catch(noop);

    return {
      primaryKeys,
      whereFilter: where,
      filterHistory,
      sorting,
      displayAfterByTable,
      columnWidthByColumn,
    };
  };

export default function TableNamePage() {
  const {
    primaryKeys,
    whereFilter,
    filterHistory,
    sorting,
    displayAfterByTable,
    columnWidthByColumn,
  } = useLoaderData() as Awaited<ReturnType<ReturnType<typeof loader>>>;

  return (
    <TableLayout
      key={whereFilter}
      primaryKeys={primaryKeys}
      where={whereFilter}
      filterHistory={filterHistory}
      sorting={sorting}
      displayAfterByTable={displayAfterByTable}
      columnWidths={columnWidthByColumn}
    />
  );
}
