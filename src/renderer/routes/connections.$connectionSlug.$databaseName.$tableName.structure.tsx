import { useCallback, useMemo } from 'react';
import {
  LoaderFunctionArgs,
  Params,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router';
import invariant from 'tiny-invariant';
import type { DisplayAfterByColumn } from '../../configuration/columnOrder';
import { useTranslation } from '../../i18n';
import type { TableStructureResult } from '../../sql/types';
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

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName' | 'tableName'>;
}

/** wide enough for a column name and the clear button */
const DISPLAY_AFTER_COLUMN_WIDTH = 220;

// TODO : migrate this loader in the `table` root url. This way we can use the foreigns keys in the table result to make some links direcly on the table grid
export async function loader({ params }: RouteParams) {
  const { connectionSlug, databaseName, tableName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');
  invariant(tableName, 'Table name is required');

  const data = await window.sql.getTableStructure(databaseName, tableName);

  const configuration = await window.config.getConfiguration();

  const displayAfterByColumn: DisplayAfterByColumn =
    configuration.connections[connectionSlug]?.appState?.configByDatabase?.[
      databaseName
    ]?.tables[tableName]?.displayAfterByColumn ?? {};

  return {
    data,
    displayAfterByColumn,
  };
}

export default function TableStructure() {
  const { t } = useTranslation();
  const { connectionSlug, databaseName, tableName } = useParams();
  const { revalidate } = useRevalidator();
  const {
    data: [result, fields],
    displayAfterByColumn,
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  const columnNames = useMemo(
    () => result.map((column) => column.Column),
    [result]
  );

  // written, then read back by the loader, rather than mirrored in a state that the next table would leave stale
  const handleDisplayAfterChange = useCallback(
    async (columnName: string, displayAfter: string | null) => {
      invariant(connectionSlug && databaseName && tableName);

      await window.config.setColumnDisplayAfter(
        connectionSlug,
        databaseName,
        tableName,
        columnName,
        displayAfter
      );

      revalidate();
    },
    [connectionSlug, databaseName, tableName, revalidate]
  );

  const extraColumns = useMemo(
    (): Array<ExtraColumn<TableStructureResult[number]>> => [
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
            onChange={handleDisplayAfterChange}
          />
        ),
      },
    ],
    [t, columnNames, displayAfterByColumn, handleDisplayAfterChange]
  );

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
