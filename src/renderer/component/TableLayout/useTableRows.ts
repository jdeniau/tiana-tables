import { useCallback, useEffect, useState } from 'react';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { TablePage, buildTableQuery } from './tableQuery';

const DEFAULT_LIMIT = 100;

type TableRows = {
  result: null | ResultRow[];
  fields: null | ResultField[];
  error: null | Error;
  loadMore: () => void;
  updateValue: (rowIndex: number, columnName: string, value: unknown) => void;
};

/** the rows of a table, fetched one page at a time */
export function useTableRows({
  database,
  tableName,
  primaryKeys,
  where,
  sorting,
}: Omit<TablePage, 'limit' | 'offset'>): TableRows {
  const dialect = useDialect();
  const [result, setResult] = useState<null | ResultRow[]>(null);
  const [fields, setFields] = useState<null | ResultField[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);

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

  const loadMore = useCallback(
    () => fetchTableData(currentOffset + DEFAULT_LIMIT),
    [fetchTableData, currentOffset]
  );

  // a written cell is patched in place rather than re-fetched: the value comes
  // from the server (see `updateCell`), so the row is as fresh as a reload
  // would make it — without losing the rows already loaded, nor the scroll
  const updateValue = useCallback(
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

  return { result, fields, error, loadMore, updateValue };
}
