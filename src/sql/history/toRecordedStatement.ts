import type { DatabaseEngine } from '../engine';
import {
  CODE_CHANNEL,
  type SqlToken,
  TokenKind,
  getParser,
  tokenKind,
} from '../parser';
import { extractTableAliases, unquote } from '../tableName';
import { namesBareColumn, tablesOf, wordsOf } from './bareColumn';
import {
  Clause,
  type RecordedBlock,
  type RecordedStatement,
} from './recordedStatement';

/** past this, a statement is data being loaded rather than a query to suggest, and parsing it would freeze the editor */
const MAX_RECORDED_LENGTH = 10_000;

const CLAUSE_KEYWORDS: ReadonlyMap<string, Clause> = new Map([
  ['SELECT', Clause.Select],
  ['FROM', Clause.From],
  ['WHERE', Clause.Where],
  ['GROUP', Clause.GroupBy],
  ['HAVING', Clause.Having],
  ['ORDER', Clause.OrderBy],
  ['LIMIT', Clause.Limit],
]);

/** what a statement the history keeps opens on: it reads or writes rows, `WITH` opening one of them */
const RECORDED_VERBS: ReadonlySet<string> = new Set([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'WITH',
]);

const JOIN_KEYWORDS: ReadonlySet<string> = new Set(['JOIN', 'STRAIGHT_JOIN']);

/** the words that may come before the `JOIN` they belong to */
const JOIN_MODIFIERS: ReadonlySet<string> = new Set([
  'LEFT',
  'RIGHT',
  'FULL',
  'INNER',
  'OUTER',
  'CROSS',
  'NATURAL',
]);

/** what ends the first `SELECT` of a compound one: only its clauses are recorded */
const SET_OPERATORS: ReadonlySet<string> = new Set([
  'UNION',
  'INTERSECT',
  'EXCEPT',
]);

/**
 * A statement that ran, as the history records it, or `null` when it must not be.
 *
 * Its shape is what the history counts it by, so that the same query run with
 * 200 different ids counts 200: its values become `?` (a list of them after
 * `IN` a single one), its aliases the table they stand for, its keywords upper
 * case, its comments and blanks are dropped.
 */
export function toRecordedStatement(
  sql: string,
  engine: DatabaseEngine
): RecordedStatement | null {
  if (sql.length > MAX_RECORDED_LENGTH) {
    return null;
  }

  const tokens = getParser(engine)
    .getAllTokens(sql)
    .filter((token) => token.channel === CODE_CHANNEL);

  if (tokens.at(-1)?.text === ';') {
    tokens.pop();
  }

  const words = tokens.map((token) => (token.text ?? '').toUpperCase());

  // never a `GRANT`, an `ALTER` or a `CREATE USER`, and the password it may hold
  if (!RECORDED_VERBS.has(words[0] ?? '')) {
    return null;
  }

  const isSelect = words[0] === 'SELECT';
  const aliases = isSelect ? extractTableAliases(sql, engine) : {};
  const shapes = shapeWords(tokens, words, engine, aliases);
  const tables = [...new Set(Object.values(aliases))].sort();
  const names = tablesOf(aliases);

  const blocks = isSelect
    ? cutClauses(tokens, words, engine).map(
        ({ clause, start, end }): RecordedBlock => {
          const shape = joinShape(shapes.slice(start, end));

          return {
            clause,
            sql: textOf(sql, tokens.slice(start, end)),
            shape,
            tables: namesBareColumn(wordsOf(shape), names, shape.split(' '))
              ? tables
              : [],
          };
        }
      )
    : [];

  return {
    sql: textOf(sql, tokens),
    shape: joinShape(shapes),
    aliases,
    blocks,
  };
}

/** what each token is in the shape, `null` for a token the shape drops */
function shapeWords(
  tokens: ReadonlyArray<SqlToken>,
  words: ReadonlyArray<string>,
  engine: DatabaseEngine,
  aliases: Record<string, string>
): Array<string | null> {
  const tables = new Map(
    Object.entries(aliases).filter(([alias, table]) => alias !== table)
  );
  const kinds = tokens.map((token) => tokenKind(engine, token));

  // `article a` or `article AS a`: the table already names what the alias did
  const declaresAlias = (index: number): boolean => {
    const table = tables.get(tokens[index]?.text ?? '');

    if (table === undefined || tokens[index + 1]?.text === '.') {
      return false;
    }

    const before = words[index - 1] === 'AS' ? index - 2 : index - 1;

    return unquote(tokens[before]?.text ?? '') === table;
  };

  return tokens.map((token, index) => {
    const text = token.text ?? '';

    switch (kinds[index]) {
      case TokenKind.Literal:
        // a dollar-quoted string is three literal tokens, and still one value
        return kinds[index - 1] === TokenKind.Literal ? null : '?';

      case TokenKind.Keyword:
        return words[index] === 'AS' && declaresAlias(index + 1)
          ? null
          : words[index];

      default:
        if (declaresAlias(index)) {
          return null;
        }

        return tokens[index + 1]?.text === '.'
          ? (tables.get(text) ?? text)
          : text;
    }
  });
}

function joinShape(words: ReadonlyArray<string | null>): string {
  return words
    .filter((word) => word !== null)
    .join(' ')
    .replace(/\bIN \( \?(?: , \?)* \)/g, 'IN ( ? )');
}

/** the text the tokens span, as it was written */
function textOf(sql: string, tokens: ReadonlyArray<SqlToken>): string {
  const first = tokens[0];
  const last = tokens.at(-1);

  return first && last ? sql.slice(first.start, last.stop + 1) : '';
}

/** the clauses of a `SELECT`, as token ranges; a subquery stays in the clause it is written in */
function cutClauses(
  tokens: ReadonlyArray<SqlToken>,
  words: ReadonlyArray<string>,
  engine: DatabaseEngine
): Array<{ clause: Clause; start: number; end: number }> {
  const starts: Array<{ clause: Clause; start: number }> = [];
  let depth = 0;
  let end = words.length;

  for (const [index, word] of words.entries()) {
    if (word === '(') {
      depth++;
    } else if (word === ')') {
      depth--;
    }

    if (depth > 0 || tokenKind(engine, tokens[index]) !== TokenKind.Keyword) {
      continue;
    }

    if (SET_OPERATORS.has(word)) {
      end = index;
      break;
    }

    const clause = clauseAt(words, index);

    if (clause !== undefined) {
      starts.push({ clause, start: index });
    }
  }

  return starts.map(({ clause, start }, position) => ({
    clause,
    start,
    end: starts[position + 1]?.start ?? end,
  }));
}

/** the clause of a `SELECT` the keyword at `index` opens */
function clauseAt(
  words: ReadonlyArray<string>,
  index: number
): Clause | undefined {
  if (opensJoin(words, index)) {
    return Clause.Join;
  }

  const word = words[index] ?? '';

  // `WITHIN GROUP (…)` and `IS DISTINCT FROM` open no clause
  if (
    (word === 'GROUP' && words[index + 1] !== 'BY') ||
    (word === 'FROM' && words[index - 1] === 'DISTINCT')
  ) {
    return undefined;
  }

  return CLAUSE_KEYWORDS.get(word);
}

/** `LEFT` in `LEFT OUTER JOIN`, but neither its `OUTER` nor its `JOIN`, nor the function `LEFT(name, 3)` */
function opensJoin(words: ReadonlyArray<string>, index: number): boolean {
  if (JOIN_MODIFIERS.has(words[index - 1] ?? '')) {
    return false;
  }

  let next = index;

  while (JOIN_MODIFIERS.has(words[next] ?? '')) {
    next++;
  }

  return JOIN_KEYWORDS.has(words[next] ?? '');
}
