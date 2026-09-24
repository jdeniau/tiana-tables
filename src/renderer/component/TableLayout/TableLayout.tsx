import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useCreateAtom, useSelector } from '@tanstack/react-store';
import type { SortingState } from '@tanstack/react-table';
import { Button, Splitter } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DisplayAfterByColumn,
  applyColumnOrder,
} from '../../../configuration/columnOrder';
import { PANEL } from '../../../configuration/panels';
import type { ColumnWidthByColumn } from '../../../configuration/type';
import { useTranslation } from '../../../i18n';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { usePanelSize } from '../../hooks/usePanelSize';
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
} from '../Style/Region';
import TableGrid from '../TableGrid';
import TableViewSwitch from '../TableViewSwitch';
import { buildTableQuery, hasOrderByToken } from './tableQuery';

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
const DEFAULT_LIMIT = 100;

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
  const [result, setResult] = useState<null | ResultRow[]>(null);
  const [fields, setFields] = useState<null | ResultField[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  // empty until a header is clicked, and again once its sort is removed: the key's order
  const sortingAtom = useCreateAtom<SortingState>([]);
  const sorting = useSelector(sortingAtom);

  const fetchTableData = useCallback(
    (offset: number) => {
      const query = buildTableQuery(dialect, {
        database,
        tableName,
        primaryKeys,
        where,
        sorting,
        limit: DEFAULT_LIMIT,
        offset,
      });

      window.sql
        .executeQuery<ResultRow[]>(query)
        .then(([result, fields]) => {
          setError(null);
          setCurrentOffset(offset);
          setFields(fields.map((field) => ({ ...field, table: tableName })));
          setResult((prev) =>
            offset > 0 && prev ? prev.concat(result) : result
          );
        })
        .catch((err) => {
          setError(err);
          setResult(null);
        });
    },
    [dialect, database, tableName, primaryKeys, where, sorting]
  );

  // a new query starts over from the first page; the next ones are fetched by "load more"
  useEffect(() => {
    fetchTableData(0);
  }, [fetchTableData]);

  // the query stays a `SELECT *`: ordering here means a column added to or dropped from the table needs no new query to be placed
  const orderedFields = useMemo(() => {
    if (!fields) {
      return null;
    }

    const byName = new Map(fields.map((field) => [field.name, field]));

    return applyColumnOrder(
      fields.map((field) => field.name),
      displayAfterByColumn
    ).flatMap((name) => byName.get(name) ?? []);
  }, [fields, displayAfterByColumn]);

  // a written cell is patched in place rather than re-fetched: the value comes
  // from the server (see `updateCell`), so the row is as fresh as a reload
  // would make it — without losing the rows already loaded, nor the scroll
  const handleValueUpdated = useCallback(
    (rowIndex: number, columnName: string, value: unknown) => {
      setResult((previous) => {
        const row = previous?.[rowIndex];

        if (!previous || !row) {
          return previous;
        }

        const next = [...previous];
        next[rowIndex] = { ...row, [columnName]: value };

        return next;
      });
    },
    []
  );

  // written, then read back by the loader on the next visit, rather than
  // mirrored in a state that the next table would leave stale
  const handleColumnResized = useCallback(
    (columnName: string, width: number) => {
      window.config.setColumnWidth(
        connectionSlug,
        database,
        tableName,
        columnName,
        width
      );
    },
    [connectionSlug, database, tableName]
  );

  // a filter's own `ORDER BY` wins, so the headers have nothing to sort
  const sortable = !hasOrderByToken(dialect, where);

  // the filter built by the grid's context menu replaces the current one, and
  // takes the same route as the filter form: the loader reads `?where`, saves it
  // and remounts this layout, so the editor reopens on the clause
  const handleFilterChange = useCallback(
    (where: string) => {
      navigate(`?where=${encodeURIComponent(where)}`);
    },
    [navigate]
  );

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
              {result && (
                <RegionMeta>
                  {t('table.rows.count', { count: result.length })}
                </RegionMeta>
              )}
            </RegionGroup>

            <TableViewSwitch />
          </RegionHeader>

          {/* the grid stays under an error: its headers are how a failed sort is left */}
          <RegionBody>
            {error && <SqlErrorComponent error={error} />}

            <TableGrid
              fields={orderedFields}
              result={result}
              primaryKeys={primaryKeys}
              onValueUpdated={handleValueUpdated}
              onFilterChange={handleFilterChange}
              columnWidths={columnWidths}
              onColumnResized={handleColumnResized}
              sortingAtom={sortingAtom}
              enableSorting={sortable}
            />
          </RegionBody>

          {!error && (
            <RegionFoot>
              <Button
                type="text"
                size="small"
                onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}
              >
                {t('table.rows.loadMore')}
              </Button>
            </RegionFoot>
          )}
        </Region>
      </Splitter.Panel>
    </Splitter>
  );
}
