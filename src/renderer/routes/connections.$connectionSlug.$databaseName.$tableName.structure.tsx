import {
  LoaderFunctionArgs,
  Params,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router';
import invariant from 'tiny-invariant';
import { getDatabaseAppState } from '../../configuration/appState';
import {
  type DisplayAfterByColumn,
  listDisplayAfterOverriddenByPrimaryKey,
} from '../../configuration/columnOrder';
import { useTranslation } from '../../i18n';
import type { TableStructureRow } from '../../sql/dialect/metadata';
import DisplayAfterSelect from '../component/DisplayAfterSelect';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../component/Style/Region';
import TableGrid, { ExtraColumn } from '../component/TableGrid';
import TableViewSwitch from '../component/TableViewSwitch';
import { loadDialect } from '../hooks/useDialect';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

/** wide enough for a column name and the clear button */
const DISPLAY_AFTER_COLUMN_WIDTH = 220;

/** wide enough for its header */
const EXTENDED_TYPE_COLUMN_WIDTH = 140;

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const dialect = await loadDialect(connectionSlug);

  window.sql.connectionNameChanged(connectionSlug, databaseName);

  const [data, primaryKeys, [, probedFields]] = await Promise.all([
    window.sql.getTableStructure(databaseName, tableName),
    window.sql.getPrimaryKeyColumns(databaseName, tableName),
    // no row, only the description of the columns: MariaDB's extended type is
    // there, and in no INFORMATION_SCHEMA table
    window.sql.executeQuery(
      `SELECT * FROM ${dialect.qualify(databaseName, tableName)} LIMIT 0`
    ),
  ]);

  const extendedTypeByColumn = new Map(
    probedFields.map((field) => [field.name, field.extendedType])
  );

  const configuration = await window.config.getConfiguration();

  const displayAfterByColumn: DisplayAfterByColumn =
    getDatabaseAppState(configuration, connectionSlug, databaseName)?.tables[
      tableName
    ]?.displayAfterByColumn ?? {};

  return {
    data,
    primaryKeys,
    displayAfterByColumn,
    extendedTypeByColumn,
  };
}

export default function TableStructure() {
  const { t } = useTranslation();
  const { connectionSlug, databaseName, tableName } = useParams();
  const { revalidate } = useRevalidator();
  const {
    data: [result, fields],
    primaryKeys,
    displayAfterByColumn,
    extendedTypeByColumn,
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  const columnNames = result.map((column) => column.Column);

  const displayAfterOverriddenByPrimaryKey =
    listDisplayAfterOverriddenByPrimaryKey(
      columnNames,
      displayAfterByColumn,
      primaryKeys
    );

  // written, then read back by the loader, rather than mirrored in a state that the next table would leave stale
  const handleDisplayAfterChange = async (
    columnName: string,
    displayAfter: string | null
  ) => {
    invariant(connectionSlug && databaseName && tableName);

    await window.config.setColumnDisplayAfter(
      connectionSlug,
      databaseName,
      tableName,
      columnName,
      displayAfter
    );

    revalidate();
  };

  const extraColumns: Array<ExtraColumn<TableStructureRow>> = [
    {
      id: 'extendedType',
      header: t('table.structure.extendedType'),
      size: EXTENDED_TYPE_COLUMN_WIDTH,
      after: 'Type',
      render: (row) => extendedTypeByColumn.get(row.Column),
    },
    {
      id: 'displayAfter',
      header: t('table.structure.displayAfter'),
      size: DISPLAY_AFTER_COLUMN_WIDTH,
      after: 'Column',
      render: (row) => (
        <DisplayAfterSelect
          columnName={row.Column}
          columns={columnNames}
          displayAfter={displayAfterByColumn[row.Column] ?? null}
          overriddenByPrimaryKey={displayAfterOverriddenByPrimaryKey.has(
            row.Column
          )}
          onChange={handleDisplayAfterChange}
        />
      ),
    },
  ];

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
        <TableGrid
          result={result}
          fields={fields}
          primaryKeys={['Column']}
          extraColumns={extraColumns}
        />
      </RegionBody>
    </Region>
  );
}
