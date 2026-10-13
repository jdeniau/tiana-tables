import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import { getDatabaseAppState } from '../../configuration/appState';
import type { DisplayAfterByColumn } from '../../configuration/columnOrder';
import type { ColumnWidthByColumn } from '../../configuration/type';
import TableLayout from '../component/TableLayout';
import { readOrderParams } from '../component/TableLayout/tableSearch';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const primaryKeys = await window.sql.getPrimaryKeyColumns(
    databaseName,
    tableName
  );

  window.config.setActiveTable(connectionSlug, databaseName, tableName);

  const configuration = await window.config.getConfiguration();

  const tableConfig = getDatabaseAppState(
    configuration,
    connectionSlug,
    databaseName
  )?.tables[tableName];

  const storedFilter = tableConfig?.currentFilter || '';
  const displayAfterByColumn: DisplayAfterByColumn =
    tableConfig?.displayAfterByColumn ?? {};
  const columnWidthByColumn: ColumnWidthByColumn =
    tableConfig?.columnWidthByColumn ?? {};

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

  return {
    primaryKeys,
    whereFilter: where,
    filterHistory,
    sorting,
    displayAfterByColumn,
    columnWidthByColumn,
  };
}

export default function TableNamePage() {
  const {
    primaryKeys,
    whereFilter,
    filterHistory,
    sorting,
    displayAfterByColumn,
    columnWidthByColumn,
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <TableLayout
      key={whereFilter}
      primaryKeys={primaryKeys}
      where={whereFilter}
      filterHistory={filterHistory}
      sorting={sorting}
      displayAfterByColumn={displayAfterByColumn}
      columnWidths={columnWidthByColumn}
    />
  );
}
