import { ReactElement } from 'react';
import { useCreateAtom, useSelector } from '@tanstack/react-store';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
import { Button, Splitter } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DisplayAfterByColumn,
  applyColumnOrder,
} from '../../../configuration/columnOrder';
import { PANEL } from '../../../configuration/panels';
import type { ColumnWidthByColumn } from '../../../configuration/type';
import { useTranslation } from '../../../i18n';
import { useDialect } from '../../hooks/useDialect';
import { usePanelSize } from '../../hooks/usePanelSize';
import DateDisplaySwitch from '../DateDisplaySwitch';
import SqlErrorComponent from '../Query/SqlErrorComponent';
import WhereFilter from '../Query/WhereFilter';
import {
  Region,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
  RegionTools,
  SelectionRegionMeta,
} from '../Style/Region';
import TableGrid from '../TableGrid';
import TableViewSwitch from '../TableViewSwitch';
import { useLastCopy } from '../useLastCopy';
import { hasOrderByToken } from './tableQuery';
import { useTableRows } from './useTableRows';

interface TableNameProps {
  connectionSlug: string;
  tableName: string;
  database: string;
  primaryKeys: Array<string>;
  where?: string;

  /** the filters this table was given, most recent first */
  filterHistory: Array<string>;

  /** set on the structure page */
  displayAfterByColumn: DisplayAfterByColumn;

  /** the widths the columns of this table were dragged to */
  columnWidths: ColumnWidthByColumn;
}

export function TableLayout({
  connectionSlug,
  tableName,
  database,
  primaryKeys,
  where,
  filterHistory,
  displayAfterByColumn,
  columnWidths,
}: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dialect = useDialect();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.TABLE_FILTERS);
  // empty until a header is clicked, and again once its sort is removed: the key's order
  const sortingAtom = useCreateAtom<SortingState>([]);
  const sorting = useSelector(sortingAtom);
  // by primary key, so it follows its rows to the next page; a new order empties it
  const selectionAtom = useCreateAtom<RowSelectionState>({});
  const [lastCopy, onRowsCopied] = useLastCopy();
  const selectedCount = useSelector(
    selectionAtom,
    (selection) => Object.keys(selection).length
  );

  const { result, fields, error, loadMore, updateValue } = useTableRows({
    database,
    tableName,
    primaryKeys,
    where,
    sorting,
  });

  // the query stays a `SELECT *`: ordering here means a column added to or dropped from the table needs no new query to be placed
  const fieldsByName = new Map(fields?.map((field) => [field.name, field]));
  const orderedFields = fields
    ? applyColumnOrder(
        fields.map((field) => field.name),
        displayAfterByColumn
      ).flatMap((name) => fieldsByName.get(name) ?? [])
    : null;

  // written, then read back by the loader on the next visit, rather than
  // mirrored in a state that the next table would leave stale
  const handleColumnResized = (columnName: string, width: number) => {
    window.config.setColumnWidth(
      connectionSlug,
      database,
      tableName,
      columnName,
      width
    );
  };

  // a filter's own `ORDER BY` wins, so the headers have nothing to sort
  const sortable = !hasOrderByToken(dialect, where);

  // the filter built by the grid's context menu replaces the current one, and
  // takes the same route as the filter form: the loader reads `?where`, saves it
  // and remounts this layout, so the editor reopens on the clause
  const handleFilterChange = (where: string) => {
    navigate(`?where=${encodeURIComponent(where)}`);
  };

  // the same two-region split as the SQL page, so the two screens read as
  // siblings: filters on top, data below
  return (
    <Splitter orientation="vertical" onResizeEnd={onResizeEnd}>
      <Splitter.Panel {...panelProps}>
        <WhereFilter
          defaultValue={where ?? ''}
          tableName={tableName}
          history={filterHistory}
        />
      </Splitter.Panel>

      <Splitter.Panel>
        <Region>
          <RegionHeader>
            <RegionGroup>
              <RegionName>{tableName}</RegionName>
              {lastCopy ? (
                <SelectionRegionMeta>
                  {t('table.rows.copied', {
                    count: lastCopy.rowCount,
                    format: lastCopy.format,
                  })}
                </SelectionRegionMeta>
              ) : (
                result &&
                (selectedCount > 0 ? (
                  <SelectionRegionMeta>
                    {t('table.rows.selected', {
                      selected: selectedCount,
                      count: result.length,
                    })}
                  </SelectionRegionMeta>
                ) : (
                  <RegionMeta>
                    {t('table.rows.count', { count: result.length })}
                  </RegionMeta>
                ))
              )}
            </RegionGroup>

            <RegionTools>
              {fields && <DateDisplaySwitch fields={fields} />}
              <TableViewSwitch />
            </RegionTools>
          </RegionHeader>

          {/* the grid stays under an error: its headers are how a failed sort is left */}
          <RegionBody>
            {error && <SqlErrorComponent error={error} />}

            <TableGrid
              fields={orderedFields}
              result={result}
              primaryKeys={primaryKeys}
              onValueUpdated={updateValue}
              onFilterChange={handleFilterChange}
              columnWidths={columnWidths}
              onColumnResized={handleColumnResized}
              sortingAtom={sortingAtom}
              enableSorting={sortable}
              selectionAtom={selectionAtom}
              onRowsCopied={onRowsCopied}
            />
          </RegionBody>

          {!error && (
            <RegionFoot>
              <Button type="text" size="small" onClick={loadMore}>
                {t('table.rows.loadMore')}
              </Button>
            </RegionFoot>
          )}
        </Region>
      </Splitter.Panel>
    </Splitter>
  );
}
