import { mysqlParser } from './mysqlParser';

/**
 * Does this query carry a `LIMIT` clause?
 *
 * We lex, we never parse: lexing always answers, while `getAllEntities` and
 * `splitSQLByStatement` return nothing as soon as the input has a syntax error
 * (see `mysqlParser.ts`). A query the user is still writing must still get an
 * answer, and "no token said LIMIT" is a safe answer to give on a broken query.
 *
 * Two behaviours are deliberate, both on the cautious side — a chart drawn on
 * partial data is worse than no chart at all:
 *
 * - a `LIMIT` nested in a subquery counts as one. The outer result set may be
 *   perfectly complete, but we cannot tell from the tokens alone.
 * - a string literal `'limit'` does not count: its token text keeps its quotes,
 *   so it never equals `LIMIT`.
 */
export function hasLimitClause(sql: string): boolean {
  return mysqlParser
    .getAllTokens(sql)
    .some((token) => token.text?.toUpperCase() === 'LIMIT');
}
