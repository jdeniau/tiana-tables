import {
  type EntityContext,
  type ErrorListener,
  MySQL,
  PostgreSQL,
} from 'dt-sql-parser';
import { DatabaseEngine } from '../engine';

/** What the app asks of a grammar: the same four methods on every engine. */
export type SqlParser = Pick<
  MySQL,
  | 'getAllTokens'
  | 'getAllEntities'
  | 'validate'
  | 'getSuggestionAtCaretPosition'
>;

/** A listener that drops what it hears. */
const ignoreErrors: ErrorListener = () => {};

/**
 * The grammars, made never to write to the console.
 *
 * Given no listener, dt-sql-parser leaves ANTLR's console one on the parser,
 * so `getAllEntities` logged every syntax error of a query being typed (DTStack/dt-sql-parser#431).
 * A listener of our own replaces it, as `validate` already does; the lexers log nothing (measured).
 */
class QuietMySQL extends MySQL {
  createParser(input: string, errorListener = ignoreErrors) {
    return super.createParser(input, errorListener);
  }
}

class QuietPostgreSQL extends PostgreSQL {
  createParser(input: string, errorListener = ignoreErrors) {
    return super.createParser(input, errorListener);
  }
}

/**
 * One parser per engine, shared by the whole app.
 *
 * A parser holds no state between calls, but it does cache the parse tree of
 * the last input it saw, so sharing one instance between completion, syntax
 * validation and highlighting means they parse the editor content once.
 */
const PARSERS: Record<DatabaseEngine, SqlParser> = {
  [DatabaseEngine.MySQL]: new QuietMySQL(),
  [DatabaseEngine.PostgreSQL]: new QuietPostgreSQL(),
};

export function getParser(engine: DatabaseEngine): SqlParser {
  return PARSERS[engine];
}

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
export function collectEntities(
  parser: SqlParser,
  sql: string
): EntityContext[] {
  let candidate = sql;

  for (let attempt = 0; attempt <= MAX_TRIM_ATTEMPTS; attempt++) {
    const entities = parser.getAllEntities(candidate);

    if (entities?.length) {
      return entities;
    }

    const lastToken = parser
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
