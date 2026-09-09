import {
  LoaderFunctionArgs,
  Params,
  useLoaderData,
  useParams,
} from 'react-router';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../i18n';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../component/Style/Region';
import TableGrid from '../component/TableGrid';
import TableViewSwitch from '../component/TableViewSwitch';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { databaseName, tableName } = params;

  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const data = await window.sql.getTableStructure(databaseName, tableName);

  return {
    data,
  };
}

export default function TableStructure() {
  const { t } = useTranslation();
  const { tableName } = useParams();
  const {
    data: [result, fields],
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  // the same header as the data region — name, meta, then the view tabs — so
  // moving between the two views only changes the body
  return (
    <Region>
      <RegionHeader>
        <RegionGroup>
          <RegionName>{tableName}</RegionName>
          <RegionMeta>
            {t('table.columns.count', { count: result.length })}
          </RegionMeta>
        </RegionGroup>

        <TableViewSwitch />
      </RegionHeader>

      <RegionBody>
        {/* the column name is pinned, so it stays in view while the rest of
            the detail scrolls horizontally */}
        <TableGrid result={result} fields={fields} primaryKeys={['Column']} />
      </RegionBody>
    </Region>
  );
}
