import { EntityContext, MySQL } from 'dt-sql-parser';

/**
 * The single MySQL parser of the app.
 *
 * The parser holds no state between calls, but it does cache the parse tree of
 * the last input it saw, so sharing one instance between completion, syntax
 * validation and highlighting means they parse the editor content once.
 */
export const mysqlParser = new MySQL();

/** an incomplete clause is a few tokens long, no need to trim further */
const MAX_TRIM_ATTEMPTS = 8;

/**
 * Collect the entities of a query, tolerating an unfinished tail.
 *
 * Entity collection is all or nothing: as soon as the statement has a syntax
 * error, ANTLR cannot pick an alternative for the enclosing rule and drops the
 * whole subtree, so `getAllEntities` returns nothing — not even the tables
 * written before the error. That is exactly what the editor sends while the
 * user is still typing (`… JOIN `, `… WHERE x = `, `… ORDER BY `), so retry on
 * shorter prefixes, dropping the trailing token each time.
 *
 * Lexing, on the other hand, never fails, which is what gives us the token
 * boundaries to cut on.
 */
export function collectEntities(sql: string): EntityContext[] {
  let candidate = sql;

  for (let attempt = 0; attempt <= MAX_TRIM_ATTEMPTS; attempt++) {
    const entities = mysqlParser.getAllEntities(candidate);

    if (entities?.length) {
      return entities;
    }

    const lastToken = mysqlParser
      .getAllTokens(candidate)
      .filter((token) => token.text?.trim())
      .at(-1);

    const shorter = lastToken ? candidate.slice(0, lastToken.start) : '';

    if (shorter.length >= candidate.length) {
      break;
    }

    candidate = shorter;

    if (!candidate.trim()) {
      break;
    }
  }

  return [];
}
