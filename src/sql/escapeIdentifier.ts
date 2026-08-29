import invariant from 'tiny-invariant';

/**
 * Quote an identifier the way MySQL does: a backtick inside a name is doubled.
 *
 * Identifiers cannot be bound to a placeholder, so they are the one part of a
 * query that is interpolated — hence the escaping.
 *
 * Written here rather than delegated to a driver, unlike the escaping of a
 * string literal (which is `escape`, straight from `mysql`). Not for lack of a
 * driver to call: `mysql.escapeId` is reachable from both processes. But its
 * default reads a `.` as a **qualifier separator** — `escapeId('a.b')` is
 * `` `a`.`b` ``, two identifiers — so every one of the callers here, which all
 * pass a single name and build the qualification themselves, would have to
 * remember `forbidQualified = true`; forgetting it mangles a dotted name in
 * silence — a syntax error on both MySQL 8.4 and MariaDB 11.4, where a dotted
 * database, table or column name is otherwise perfectly legal (see the test).
 * And `escapeId('')` answers with two bare backticks, invalid SQL with no
 * complaint, where the invariant below names the bug instead.
 *
 * The duplication is one `replaceAll` of one character, fixed by MySQL's
 * grammar — not a table of driver policy that could drift.
 *
 * `mysql2.escapeId` is doubly out of reach anyway: the renderer cannot import
 * mysql2 at all, and the main process keeps it behind a lazy `await import()`
 * until a connection is actually opened (`src/sql/index.ts`).
 */
export function escapeIdentifier(identifier: string): string {
  invariant(identifier.length > 0, 'An empty identifier cannot be escaped');

  return `\`${identifier.replaceAll('`', '``')}\``;
}
