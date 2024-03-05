import { RowDataPacket } from 'mysql2';
import { Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import TableLayout from '../component/TableLayout';

type RouteParams = {
  params: Params<'connectionName' | 'databaseName' | 'tableName'>;
};

interface ShowKeyRow extends RowDataPacket {
  Column_name: string;
}

export async function loader({ params }: RouteParams) {
  const { connectionName, databaseName, tableName } = params;

  invariant(connectionName, 'Connection name is required');

  const [result] = await window.sql.executeQuery<ShowKeyRow[]>(
    connectionName,
    `SHOW KEYS FROM ${databaseName}.${tableName} WHERE Key_name = 'PRIMARY';`
  );

  const primaryKeys = result.map((row) => row.Column_name);

  return {
    primaryKeys,
  };
}

export default function TableNamePage() {
  const { primaryKeys } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return <TableLayout primaryKeys={primaryKeys} />;
}
