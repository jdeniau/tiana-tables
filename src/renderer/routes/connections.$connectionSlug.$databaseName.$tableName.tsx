import {
  LoaderFunctionArgs,
  Params,
  useLoaderData,
  useLocation,
} from 'react-router';
import invariant from 'tiny-invariant';
import TableLayout from '../component/TableLayout';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

export async function loader({ params }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const [primaryKeyResult] = await window.sql.getPrimaryKeys(tableName);
  const [foreignKeys] = await window.sql.getForeignKeys(tableName);

  const primaryKeys = primaryKeyResult.map((row) => row.Column_name);

  window.config.setActiveTable(connectionSlug, databaseName, tableName);

  return {
    primaryKeys,
    foreignKeys,
  };
}

export default function TableNamePage() {
  const { primaryKeys, foreignKeys } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >;
  const location = useLocation();

  const where = new URLSearchParams(location.search).get('where');

  console.log(where);

  return (
    <TableLayout
      primaryKeys={primaryKeys}
      foreignKeys={foreignKeys}
      where={where ?? ''}
    />
  );
}
