import { RowDataPacket } from 'mysql2';
import { Params, useLoaderData } from 'react-router';
import TableLayout from '../component/TableLayout';

type RouteParams = {
  params: Params<'connectionName' | 'databaseName' | 'tableName'>;
};

interface ShowKeyRow extends RowDataPacket {
  Column_name: string;
}

export async function loader({ params }: RouteParams) {
  const { databaseName, tableName } = params;

  const [result] = await window.sql.executeQuery<ShowKeyRow[]>(
    `SHOW KEYS FROM ${databaseName}.${tableName} WHERE Key_name = 'PRIMARY';`
  );

  const primaryKeys = result.map((row) => row.Column_name);

  return {
    primaryKeys,
  };
}

export default function TableName() {
  const { primaryKeys } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return <TableLayout primaryKeys={primaryKeys} />;
}
