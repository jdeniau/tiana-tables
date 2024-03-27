import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
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

  const [result] = await window.sql.getPrimaryKeys(tableName);

  console.log(result);

  const primaryKeys = result.map((row) => row.Column_name);

  window.config.setActiveTable(connectionSlug, databaseName, tableName);

  return {
    primaryKeys,
  };
}

export default function TableNamePage() {
  const { primaryKeys } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return <TableLayout primaryKeys={primaryKeys} />;
}
