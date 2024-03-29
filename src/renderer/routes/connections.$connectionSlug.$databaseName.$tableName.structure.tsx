import { Flex } from 'antd';
import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import TableGrid from '../component/TableGrid';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { tableName } = params;

  invariant(tableName, 'Table name is required');

  const data = await window.sql.getKeyColumnUsage(tableName);

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
      <TableGrid
        title={() => 'KEY COLUMN USAGE'}
        result={result}
        fields={fields}
      />
    </Flex>
  );
}
