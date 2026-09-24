import type { Dialect } from '../../../sql/dialect/types';
import { getParser } from '../../../sql/parser';

interface TablePage {
  database: string;
  tableName: string;
  primaryKeys: string[];
  /** the body of a `WHERE`, as the user wrote it */
  where?: string;
  limit: number;
  offset: number;
}

/** Whether the filter orders the rows itself: lexed, so a filter being typed still answers. */
function ordersRows(where: string, dialect: Dialect): boolean {
  return getParser(dialect.engine)
    .getAllTokens(where)
    .some((token) => token.text?.toUpperCase() === 'ORDER');
}

/**
 * One page of a table.
 *
 * Ordered by the primary key: without an order, `LIMIT … OFFSET` pages
 * whatever order the server scans in — PostgreSQL's heap moves an updated row
 * to its end, so a row could show on two pages, or on none. A filter holding
 * its own `ORDER BY` keeps it, and a table without a key keeps the server's.
 */
export function buildTableQuery(dialect: Dialect, page: TablePage): string {
  const { where, primaryKeys } = page;
  const order =
    primaryKeys.length > 0 && !(where && ordersRows(where, dialect))
      ? ` ORDER BY ${primaryKeys.map(dialect.escapeIdentifier).join(', ')}`
      : '';

  // the identifiers are escaped, the filter is not: it is SQL the user wrote, and is sent as written
  return `SELECT * FROM ${dialect.qualify(page.database, page.tableName)}${
    where ? ` WHERE ${where}` : ''
  }${order} LIMIT ${page.limit} OFFSET ${page.offset};`;
}
