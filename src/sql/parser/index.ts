import {
  type EntityContext,
  type ErrorListener,
  MySQL,
  PostgreSQL,
} from 'dt-sql-parser';
import { MySqlLexer } from 'dt-sql-parser/dist/lib/mysql/MySqlLexer';
import { PostgreSqlLexer } from 'dt-sql-parser/dist/lib/postgresql/PostgreSqlLexer';
import { DatabaseEngine } from '../engine';
import { SQL_RESERVED_KEYWORDS } from '../keywords';

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

/** A token of the content, as `getAllTokens` hands it. */
export type SqlToken = ReturnType<SqlParser['getAllTokens']>[number];

/**
 * The channel the lexer puts SQL on. Whitespace and comments go to another
 * one, which is what tells a separator from a `;` written in a comment.
 */
export const CODE_CHANNEL = 0;

/** What a token of the content stands for, whatever the engine. */
export enum TokenKind {
  Keyword = 'keyword',
  /** a value written in the query: a string, a number, a bit or hex string */
  Literal = 'literal',
  Other = 'other',
}

/** A dollar-quoted string is three tokens on PostgreSQL, each one a literal. */
const LITERAL_TYPES: Record<DatabaseEngine, ReadonlySet<number>> = {
  [DatabaseEngine.MySQL]: new Set([
    MySqlLexer.STRING_LITERAL,
    MySqlLexer.START_NATIONAL_STRING_LITERAL,
    MySqlLexer.DECIMAL_LITERAL,
    MySqlLexer.ZERO_DECIMAL,
    MySqlLexer.ONE_DECIMAL,
    MySqlLexer.TWO_DECIMAL,
    MySqlLexer.THREE_DECIMAL,
    MySqlLexer.REAL_LITERAL,
    MySqlLexer.HEXADECIMAL_LITERAL,
    MySqlLexer.BIT_STRING,
  ]),
  [DatabaseEngine.PostgreSQL]: new Set([
    PostgreSqlLexer.StringConstant,
    PostgreSqlLexer.EscapeStringConstant,
    PostgreSqlLexer.UnicodeEscapeStringConstant,
    PostgreSqlLexer.BeginDollarStringConstant,
    PostgreSqlLexer.DollarText,
    PostgreSqlLexer.EndDollarStringConstant,
    PostgreSqlLexer.BinaryStringConstant,
    PostgreSqlLexer.HexadecimalStringConstant,
    PostgreSqlLexer.Integral,
    PostgreSqlLexer.Numeric,
  ]),
};

/** the lexers read a column named `password` or `name` as a keyword */
const KEYWORDS: ReadonlySet<string> = new Set(SQL_RESERVED_KEYWORDS);

export function tokenKind(engine: DatabaseEngine, token: SqlToken): TokenKind {
  // the MySQL lexer reads a backquoted name as a string literal
  if (token.text?.startsWith('`')) {
    return TokenKind.Other;
  }

  if (LITERAL_TYPES[engine].has(token.type)) {
    return TokenKind.Literal;
  }

  return KEYWORDS.has(token.text?.toUpperCase() ?? '')
    ? TokenKind.Keyword
    : TokenKind.Other;
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
): Array<EntityContext> {
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
