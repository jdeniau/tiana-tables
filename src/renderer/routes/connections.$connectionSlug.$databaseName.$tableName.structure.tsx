import { LoaderFunctionArgs, Params, useLoaderData } from 'react-router';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../i18n';
import {
  Region,
  RegionBody,
  RegionHeader,
  RegionName,
} from '../component/Style/Region';
import TableGrid from '../component/TableGrid';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { databaseName, tableName } = params;

  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const data = await window.sql.getKeyColumnUsage(databaseName, tableName);

  return {
    data,
  };
}

export default function TableStructure() {
  const { t } = useTranslation();
  const {
    data: [result, fields],
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <Region>
      <RegionHeader>
        <RegionName>{t('table.structure.title')}</RegionName>
      </RegionHeader>

      <RegionBody>
        <TableGrid
          result={result}
          fields={fields}
          primaryKeys={['TABLE_NAME', 'COLUMN_NAME']}
        />
      </RegionBody>
    </Region>
  );
}
