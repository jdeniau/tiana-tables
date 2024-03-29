import {
  LoaderFunctionArgs,
  Params,
  useLoaderData,
  useLocation,
} from 'react-router';
import invariant from 'tiny-invariant';
import {
  ForeignKeysContext,
  ForeignKeysContextProvider,
} from '../../contexts/ForeignKeysContext';
import { ForeignKeyRow } from '../../sql/types';
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
  const primaryKeys = primaryKeyResult.map((row) => row.Column_name);

  const [getKeyColumnUsageRows] = await window.sql.getKeyColumnUsage(tableName);
  const foreignKeys: ForeignKeysContext = Object.fromEntries(
    getKeyColumnUsageRows
      .filter(
        (key): key is ForeignKeyRow =>
          !!(key.REFERENCED_COLUMN_NAME && key.REFERENCED_COLUMN_NAME)
      )
      .map((row) => [
        row.COLUMN_NAME,
        {
          referencedTableName: row.REFERENCED_TABLE_NAME,
          referencedColumnName: row.REFERENCED_COLUMN_NAME,
        },
      ])
  );

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

  return (
    <ForeignKeysContextProvider foreignKeys={foreignKeys}>
      <TableLayout primaryKeys={primaryKeys} where={where ?? ''} />
    </ForeignKeysContextProvider>
  );
}
