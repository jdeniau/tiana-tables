import { useEffect, useState } from 'react';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { TablePage, buildTableQuery } from './tableQuery';

const DEFAULT_LIMIT = 100;

interface TableRows {
  /** the pages loaded so far, `null` until the first one arrives and again after an error */
  result: null | ResultRow[];
  /** the columns of the last page, each tagged with this table */
  fields: null | ResultField[];
  /** the last fetch's error, cleared by the next one that succeeds */
  error: null | Error;
  /** fetches the next page and appends it to `result` */
  loadMore: () => void;
  /** stable: writes the value the server answered into the row already loaded */
  updateValue: (rowIndex: number, columnName: string, value: unknown) => void;
}

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

  const fetchTableData = (offset: number) => {
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
  };

  // a new query starts over from the first page; the next ones are fetched by "load more"
  useEffect(() => {
    fetchTableData(0);
  }, [fetchTableData]);

  const loadMore = () => fetchTableData(currentOffset + DEFAULT_LIMIT);

  // patched in place, not re-fetched: the value is the server's (see `updateCell`),
  // as fresh as a reload, without losing the rows loaded nor the scroll
  const updateValue = (
    rowIndex: number,
    columnName: string,
    value: unknown
  ) => {
    setResult((previous) => {
      const row = previous?.[rowIndex];

      if (!previous || !row) {
        return previous;
      }

      const next = [...previous];
      next[rowIndex] = { ...row, [columnName]: value };

      return next;
    });
  };

  return { result, fields, error, loadMore, updateValue };
}
