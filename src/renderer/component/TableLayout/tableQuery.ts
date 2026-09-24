import type { SortingState } from '@tanstack/react-table';
import type { Dialect } from '../../../sql/dialect/types';
import { getParser } from '../../../sql/parser';

interface TablePage {
  database: string;
  tableName: string;
  primaryKeys: string[];
  /** the body of a `WHERE`, as the user wrote it */
  where?: string;
  /** the columns the user sorted on, in order; the primary key's order when empty */
  sorting: SortingState;
  limit: number;
  offset: number;
}

/** Whether the filter orders the rows itself: lexed, so a filter being typed still answers. */
export function hasOrderByToken(
  dialect: Dialect,
  where: string | undefined
): boolean {
  return (
    !!where &&
    getParser(dialect.engine)
      .getAllTokens(where)
      .some((token) => token.text?.toUpperCase() === 'ORDER')
  );
}

function orderTerms(
  dialect: Dialect,
  primaryKeys: string[],
  sorting: SortingState
): string[] {
  const sorted = sorting.map(
    ({ id, desc }) => `${dialect.escapeIdentifier(id)} ${desc ? 'DESC' : 'ASC'}`
  );
  // the key breaks the ties of the sorted columns, or equal values would page in no fixed order
  const keys = primaryKeys
    .filter((key) => !sorting.some(({ id }) => id === key))
    .map(dialect.escapeIdentifier);

  return [...sorted, ...keys];
}

/**
 * One page of a table.
 *
 * Ordered by the sorted columns, then by the primary key:
 * without an order, `LIMIT … OFFSET` pages whatever order the server scans in —
 * PostgreSQL's heap moves an updated row to its end, so a row could show on two pages, or on none.
 * A filter holding its own `ORDER BY` keeps it, and a table without a key keeps the server's.
 */
export function buildTableQuery(dialect: Dialect, page: TablePage): string {
  const { where, primaryKeys, sorting, limit, offset, database, tableName } =
    page;
  const terms = hasOrderByToken(dialect, where)
    ? []
    : orderTerms(dialect, primaryKeys, sorting);
  const order = terms.length > 0 ? ` ORDER BY ${terms.join(', ')}` : '';

  // the identifiers are escaped, the filter is not: it is SQL the user wrote, and is sent as written
  return `SELECT * FROM ${dialect.qualify(database, tableName)}${
    where ? ` WHERE ${where}` : ''
  }${order} LIMIT ${limit} OFFSET ${offset};`;
}
