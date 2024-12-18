import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import TableLayout from '../component/TableLayout';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const [primaryKeyResult] = await window.sql.getPrimaryKeys(tableName);
  const primaryKeys = primaryKeyResult.map((row) => row.Column_name);

  window.config.setActiveTable(connectionSlug, databaseName, tableName);

  const configuration = await window.config.getConfiguration();

  const whereFilter =
    configuration.connections[connectionSlug]?.appState?.configByDatabase?.[
      databaseName
    ]?.tables[tableName]?.currentFilter || '';

  const where = new URL(request.url).searchParams.get('where') || whereFilter;

  window.config.setTableFilter(connectionSlug, databaseName, tableName, where);

  return {
    primaryKeys,
    whereFilter: where,
  };
}

export default function TableNamePage() {
  const { primaryKeys, whereFilter } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >;

  return (
    <TableLayout
      key={whereFilter}
      primaryKeys={primaryKeys}
      where={whereFilter}
    />
  );
}
