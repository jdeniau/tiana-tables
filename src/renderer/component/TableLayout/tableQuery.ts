import type { Dialect } from '../../../sql/dialect/types';
import { getParser } from '../../../sql/parser';
import type { SortOrder } from '../../../sql/sortOrder';

interface TablePage {
  database: string;
  tableName: string;
  primaryKeys: string[];
  /** the body of a `WHERE`, as the user wrote it */
  where?: string;
  /** the column the user sorted on, the primary key's order when absent */
  sort?: SortOrder | null;
  limit: number;
  offset: number;
}

/** Whether the filter orders the rows itself: lexed, so a filter being typed still answers. */
export function filterOrdersRows(
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
  sort: SortOrder | null | undefined
): string[] {
  const keys = primaryKeys
    .filter((key) => key !== sort?.column)
    .map(dialect.escapeIdentifier);

  // the key breaks the ties of the sorted column, or equal values would page in no fixed order
  return sort
    ? [
        `${dialect.escapeIdentifier(sort.column)} ${sort.direction.toUpperCase()}`,
        ...keys,
      ]
    : keys;
}

/**
 * One page of a table.
 *
 * Ordered by the sorted column, then by the primary key:
 * without an order, `LIMIT … OFFSET` pages whatever order the server scans in —
 * PostgreSQL's heap moves an updated row to its end, so a row could show on two pages, or on none.
 * A filter holding its own `ORDER BY` keeps it, and a table without a key keeps the server's.
 */
export function buildTableQuery(dialect: Dialect, page: TablePage): string {
  const { where } = page;
  const terms = filterOrdersRows(dialect, where)
    ? []
    : orderTerms(dialect, page.primaryKeys, page.sort);
  const order = terms.length > 0 ? ` ORDER BY ${terms.join(', ')}` : '';

  // the identifiers are escaped, the filter is not: it is SQL the user wrote, and is sent as written
  return `SELECT * FROM ${dialect.qualify(page.database, page.tableName)}${
    where ? ` WHERE ${where}` : ''
  }${order} LIMIT ${page.limit} OFFSET ${page.offset};`;
}
