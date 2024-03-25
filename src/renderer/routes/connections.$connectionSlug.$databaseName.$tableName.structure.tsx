import { Flex } from 'antd';
import { RowDataPacket } from 'mysql2';
import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import TableGrid from '../component/TableGrid';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

interface KeyColumnUsageRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const data = await window.sql.executeQuery<KeyColumnUsageRow[]>(
    connectionSlug,
    `SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_NAME = '${tableName}'
    AND REFERENCED_TABLE_NAME IS NOT NULL
    `
  );

  // window.config.setActiveTable(connectionSlug, databaseName, tableName);

  console.log(data);

  return {
    data,
  };
}

export default function TableStructure() {
  const {
    data: [result, fields],
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <Flex vertical style={{ height: '100%' }}>
      <TableGrid title={() => 'FOREIGN KEYS'} result={result} fields={fields} />
    </Flex>
  );
}
