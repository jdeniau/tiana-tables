import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import type { DisplayAfterByColumn } from '../../configuration/columnOrder';
import TableLayout from '../component/TableLayout';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const [primaryKeyResult] = await window.sql.getPrimaryKeys(
    databaseName,
    tableName
  );
  const primaryKeys = primaryKeyResult.map((row) => row.Column_name);

  window.config.setActiveTable(connectionSlug, databaseName, tableName);

  const configuration = await window.config.getConfiguration();

  const tableConfig =
    configuration.connections[connectionSlug]?.appState?.configByDatabase?.[
      databaseName
    ]?.tables[tableName];

  const storedFilter = tableConfig?.currentFilter || '';
  const displayAfterByColumn: DisplayAfterByColumn =
    tableConfig?.displayAfterByColumn ?? {};

  // An empty `where` param is a filter the user just cleared, not an absent
  // one: only fall back to the stored filter when the param is not there.
  const whereParam = new URL(request.url).searchParams.get('where');
  const where = whereParam ?? storedFilter;

  // the write answers the history it just pushed the filter into, so the page
  // and the file never hold two versions of it
  const filterHistory = await window.config.setTableFilter(
    connectionSlug,
    databaseName,
    tableName,
    where
  );

  return {
    primaryKeys,
    whereFilter: where,
    filterHistory,
    displayAfterByColumn,
  };
}

export default function TableNamePage() {
  const { primaryKeys, whereFilter, filterHistory, displayAfterByColumn } =
    useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <TableLayout
      key={whereFilter}
      primaryKeys={primaryKeys}
      where={whereFilter}
      filterHistory={filterHistory}
      displayAfterByColumn={displayAfterByColumn}
    />
  );
}
